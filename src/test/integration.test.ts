import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildServer } from '../app/build-server.js';
import { providerRegistry } from '../modules/providers/registry.js';
import {
  addTenantMembership,
  createAssistant,
  createBrandProfile,
  createCallMessage,
  createCallRecord,
  createPhoneNumber,
  createTenant,
  createUser,
  ensureTestDatabase,
  extractCookie,
  jsonHeaders,
  resetDatabase,
  seedProviderDefaults,
} from './helpers.js';

beforeAll(async () => {
  await ensureTestDatabase();
});

beforeEach(async () => {
  await resetDatabase();
  await seedProviderDefaults();
});

afterAll(async () => {
  const { closeTestConnections } = await import('./helpers.js');
  await closeTestConnections();
});

describe('Phase 0/1/2 integration coverage', () => {
  test('health and readiness endpoints respond successfully', async () => {
    const server = await buildServer();

    try {
      const health = await server.inject({ method: 'GET', url: '/health' });
      const ready = await server.inject({ method: 'GET', url: '/ready' });

      expect(health.statusCode).toBe(200);
      expect(ready.statusCode).toBe(200);
    } finally {
      await server.close();
    }
  });

  test('auth me and switch-tenant resolve session context', async () => {
    const tenantA = await createTenant({ name: 'Tenant A', slug: 'tenant-a' });
    const tenantB = await createTenant({ name: 'Tenant B', slug: 'tenant-b' });
    const { user, password } = await createUser({ email: 'member@example.com' });
    await addTenantMembership({ userId: user.id, tenantId: tenantA.id, role: 'tenant_admin' });
    await addTenantMembership({ userId: user.id, tenantId: tenantB.id, role: 'tenant_viewer' });

    const server = await buildServer();

    try {
      const login = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: jsonHeaders(),
        payload: { email: user.email, password },
      });
      expect(login.statusCode).toBe(200);

      const cookie = extractCookie(login.headers['set-cookie']);
      const me = await server.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie },
      });

      expect(me.statusCode).toBe(200);
      const mePayload = me.json() as {
        data: { tenant: { id: string } | null; memberships: Array<{ id: string }> };
      };
      expect(mePayload.data.memberships).toHaveLength(2);
      expect(mePayload.data.tenant?.id).toBe(tenantA.id);

      const switched = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/switch-tenant',
        headers: jsonHeaders(cookie),
        payload: { tenantId: tenantB.id },
      });

      expect(switched.statusCode).toBe(200);
      const switchedCookie = extractCookie(switched.headers['set-cookie']);
      const meAfterSwitch = await server.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: switchedCookie },
      });

      expect(meAfterSwitch.statusCode).toBe(200);
      expect((meAfterSwitch.json() as { data: { tenant: { id: string } } }).data.tenant.id).toBe(tenantB.id);
    } finally {
      await server.close();
    }
  });

  test('calls routes are tenant scoped and expose detail plus recordings', async () => {
    const tenantA = await createTenant({ name: 'Clinic A', slug: 'clinic-a' });
    const tenantB = await createTenant({ name: 'Clinic B', slug: 'clinic-b' });
    const { user, password } = await createUser({ email: 'calls@example.com' });
    await addTenantMembership({ userId: user.id, tenantId: tenantA.id, role: 'tenant_admin' });

    const visibleCall = await createCallRecord({
      tenantId: tenantA.id,
      recordingKey: 'recordings/test/a.wav',
    });
    await createCallMessage(visibleCall.id, 'caller', 'Hello');
    await createCallMessage(visibleCall.id, 'assistant', 'Hi there');
    await createCallRecord({ tenantId: tenantB.id });

    const storageDir = path.join(process.cwd(), 'storage', 'recordings', 'test');
    await mkdir(storageDir, { recursive: true });
    await writeFile(path.join(storageDir, 'a.wav'), Buffer.from('RIFFtest'));

    const server = await buildServer();

    try {
      const login = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: jsonHeaders(),
        payload: { email: user.email, password },
      });
      const cookie = extractCookie(login.headers['set-cookie']);

      const list = await server.inject({
        method: 'GET',
        url: '/api/v1/calls',
        headers: { cookie },
      });

      expect(list.statusCode).toBe(200);
      const listPayload = list.json() as { data: Array<{ id: string }> };
      expect(listPayload.data).toHaveLength(1);
      expect(listPayload.data[0]?.id).toBe(visibleCall.id);

      const detail = await server.inject({
        method: 'GET',
        url: `/api/v1/calls/${visibleCall.id}`,
        headers: { cookie },
      });

      expect(detail.statusCode).toBe(200);
      expect((detail.json() as { data: { messages: Array<unknown> } }).data.messages).toHaveLength(2);

      const recording = await server.inject({
        method: 'GET',
        url: `/api/v1/calls/${visibleCall.id}/recording`,
        headers: { cookie },
      });

      expect(recording.statusCode).toBe(200);
      expect(recording.headers['content-type']).toContain('audio/wav');
    } finally {
      await server.close();
    }
  });

  test('calls outbound route creates a call through the provider registry', async () => {
    const tenant = await createTenant({ name: 'Outbound Co', slug: 'outbound-co' });
    const { user, password } = await createUser({ email: 'outbound@example.com' });
    await addTenantMembership({ userId: user.id, tenantId: tenant.id, role: 'tenant_admin' });
    await createAssistant(tenant.id);
    await createBrandProfile(tenant.id);
    await createPhoneNumber(tenant.id, '+15551112222');

    const originalTelephony = providerRegistry.telephony;
    providerRegistry.telephony = () => ({
      name: 'twilio',
      generateCallResponse: () => '<Response/>',
      makeCall: async () => 'CA_TEST_123',
      sendSms: async () => {},
      validateWebhook: () => true,
      getMediaStreamConfig: () => ({
        audioEvent: 'media',
        encoding: 'mulaw',
        sampleRate: 8000,
      }),
    });

    const server = await buildServer();

    try {
      const login = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: jsonHeaders(),
        payload: { email: user.email, password },
      });
      const cookie = extractCookie(login.headers['set-cookie']);

      const outbound = await server.inject({
        method: 'POST',
        url: '/api/v1/calls/outbound',
        headers: jsonHeaders(cookie),
        payload: {
          to: '+15559990000',
          from: '+15551112222',
          publicBaseUrl: 'https://example.ngrok.app',
        },
      });

      expect(outbound.statusCode).toBe(200);
      expect((outbound.json() as { data: { providerCallSid: string } }).data.providerCallSid).toBe('CA_TEST_123');
    } finally {
      providerRegistry.telephony = originalTelephony;
      await server.close();
    }
  });

  test('brand and assistant routes use the active tenant context', async () => {
    const tenant = await createTenant({ name: 'Brand Co', slug: 'brand-co' });
    const { user, password } = await createUser({ email: 'brand@example.com' });
    await addTenantMembership({ userId: user.id, tenantId: tenant.id, role: 'tenant_admin' });

    const server = await buildServer();

    try {
      const login = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: jsonHeaders(),
        payload: { email: user.email, password },
      });
      const cookie = extractCookie(login.headers['set-cookie']);

      const brandUpdate = await server.inject({
        method: 'PUT',
        url: '/api/v1/admin/brand',
        headers: jsonHeaders(cookie),
        payload: {
          businessName: 'Acme Dental',
          tagline: 'Smiles answered fast',
          industry: 'Dental',
          description: 'Dental office',
          website: 'https://acme.example',
          email: 'hello@acme.example',
          phone: '+15550001111',
          addresses: [],
          services: [],
          policies: [],
          faqs: [],
          staff: [],
          brandVoice: { toneKeywords: [], wordsToUse: [], wordsToAvoid: [], samplePhrases: [] },
          escalationRules: [],
        },
      });

      expect(brandUpdate.statusCode).toBe(200);

      const brandGet = await server.inject({
        method: 'GET',
        url: '/api/v1/admin/brand',
        headers: { cookie },
      });
      expect(brandGet.statusCode).toBe(200);
      expect((brandGet.json() as { tenant: { id: string } }).tenant.id).toBe(tenant.id);

      const assistantUpdate = await server.inject({
        method: 'PUT',
        url: '/api/v1/admin/assistant',
        headers: jsonHeaders(cookie),
        payload: {
          primaryLanguage: 'es',
          multilingualEnabled: true,
        },
      });

      expect(assistantUpdate.statusCode).toBe(200);

      const assistantGet = await server.inject({
        method: 'GET',
        url: '/api/v1/admin/assistant',
        headers: { cookie },
      });

      expect(assistantGet.statusCode).toBe(200);
      expect((assistantGet.json() as { data: { primaryLanguage: string } }).data.primaryLanguage).toBe('es');
    } finally {
      await server.close();
    }
  });

  test('platform provider routes require platform role and persist updates', async () => {
    const { user, password } = await createUser({
      email: 'platform@example.com',
      platformRole: 'platform_super_admin',
    });

    const server = await buildServer();

    try {
      const login = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: jsonHeaders(),
        payload: { email: user.email, password },
      });
      const cookie = extractCookie(login.headers['set-cookie']);

      const getProviders = await server.inject({
        method: 'GET',
        url: '/api/v1/platform/providers',
        headers: { cookie },
      });

      expect(getProviders.statusCode).toBe(200);

      const updateProviders = await server.inject({
        method: 'PUT',
        url: '/api/v1/platform/providers',
        headers: jsonHeaders(cookie),
        payload: {
          sttProvider: 'groq',
          ttsProvider: 'openai',
        },
      });

      expect(updateProviders.statusCode).toBe(200);
      const payload = updateProviders.json() as { data: { stt: string; tts: string } };
      expect(payload.data.stt).toBe('groq');
      expect(payload.data.tts).toBe('openai');
    } finally {
      await server.close();
    }
  });
});
