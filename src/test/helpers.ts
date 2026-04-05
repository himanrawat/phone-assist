import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, queryClient } from '../shared/config/database.js';
import { redis } from '../shared/config/redis.js';
import { hashPassword } from '../shared/auth/password.js';
import {
  aiAssistants,
  brandProfiles,
  callMessages,
  calls,
  phoneNumbers,
  providerConfig,
  tenantMembers,
  tenants,
  users,
} from '../shared/db/schema.js';
import {
  assignTenantSubscription,
  ensureDefaultPlans,
  getDefaultPlan,
  listPlans,
} from '../modules/plans/plans.service.js';

const TEST_DB_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/phone_assistant_test';

function requireInserted<T>(value: T | undefined, entity: string) {
  if (!value) {
    throw new Error(`Failed to insert ${entity}.`);
  }

  return value;
}

function getAdminDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  url.pathname = '/postgres';
  return url.toString();
}

export async function ensureTestDatabase() {
  const databaseUrl = new URL(TEST_DB_URL);
  const databaseName = databaseUrl.pathname.replace(/^\//, '');
  const adminSql = postgres(getAdminDatabaseUrl(TEST_DB_URL), { max: 1 });

  try {
    const existing = await adminSql<{ exists: boolean }[]>`
      select exists(select 1 from pg_database where datname = ${databaseName}) as exists
    `;

    if (!existing[0]?.exists) {
      await adminSql.unsafe(`create database "${databaseName}"`);
    }
  } finally {
    await adminSql.end({ timeout: 5 });
  }

  await migrate(db, { migrationsFolder: 'drizzle' });
}

export async function resetDatabase() {
  await db.execute(`
    TRUNCATE TABLE
      call_messages,
      calls,
      contacts,
      tenant_upgrade_requests,
      tenant_usage_rollups,
      tenant_language_access,
      tenant_subscription_overrides,
      tenant_subscriptions,
      plan_entitlements,
      plans,
      phone_numbers,
      tenant_working_hours,
      tenant_invitations,
      sessions,
      tenant_members,
      brand_profiles,
      ai_assistants,
      provider_config,
      tenants,
      users
    RESTART IDENTITY CASCADE
  `);

  await redis.flushdb();
}

export async function closeTestConnections() {
  await redis.quit();
  await queryClient.end({ timeout: 5 });
}

export async function seedProviderDefaults() {
  await ensureDefaultPlans();
  await db.insert(providerConfig).values([
    { key: 'telephony', provider: 'twilio' },
    { key: 'stt', provider: 'deepgram' },
    { key: 'tts', provider: 'groq' },
    { key: 'llm', provider: 'groq' },
  ]).onConflictDoNothing();
}

export async function createTenant(input?: Partial<{
  name: string;
  slug: string;
  industry: string;
  timezone: string;
}>) {
  const [tenant] = await db.insert(tenants).values({
    name: input?.name ?? `Tenant ${randomUUID().slice(0, 8)}`,
    slug: input?.slug ?? `tenant-${randomUUID().slice(0, 8)}`,
    industry: input?.industry,
    timezone: input?.timezone ?? 'UTC',
  }).returning();

  return requireInserted(tenant, 'tenant');
}

export async function createUser(input?: Partial<{
  email: string;
  password: string;
  name: string;
  platformRole: 'platform_super_admin' | 'platform_support' | null;
}>) {
  const password = input?.password ?? `phone-assistant-${randomUUID()}`;
  const [user] = await db.insert(users).values({
    email: input?.email ?? `${randomUUID()}@example.com`,
    passwordHash: await hashPassword(password),
    name: input?.name ?? 'Test User',
    platformRole: input?.platformRole ?? null,
  }).returning();

  return { user: requireInserted(user, 'user'), password };
}

export async function addTenantMembership(input: {
  userId: string;
  tenantId: string;
  role?: 'tenant_admin' | 'tenant_manager' | 'tenant_viewer';
}) {
  await db.insert(tenantMembers).values({
    userId: input.userId,
    tenantId: input.tenantId,
    role: input.role ?? 'tenant_admin',
  });
}

export async function assignDefaultSubscription(tenantId: string) {
  const defaultPlan = await getDefaultPlan();
  return assignTenantSubscription({
    tenantId,
    planId: defaultPlan.id,
  });
}

export async function assignSubscriptionBySlug(tenantId: string, slug: string) {
  const plans = await listPlans();
  const plan = plans.find((item) => item.slug === slug);
  if (!plan) {
    throw new Error(`Plan ${slug} not found`);
  }

  return assignTenantSubscription({
    tenantId,
    planId: plan.id,
  });
}

export async function createCallRecord(input: {
  tenantId: string;
  callerNumber?: string;
  dialedNumber?: string;
  status?: 'ringing' | 'in_progress' | 'completed';
  recordingKey?: string | null;
}) {
  const [call] = await db.insert(calls).values({
    tenantId: input.tenantId,
    direction: 'inbound',
    status: input.status ?? 'completed',
    callerNumber: input.callerNumber ?? '+15555550100',
    dialedNumber: input.dialedNumber ?? '+15555550200',
    provider: 'twilio',
    recordingKey: input.recordingKey ?? null,
    recordingUrl: input.recordingKey ? `/api/v1/calls/test/recording` : null,
  }).returning();

  return requireInserted(call, 'call');
}

export async function createCallMessage(callId: string, role: string, content: string) {
  await db.insert(callMessages).values({ callId, role, content });
}

export async function createBrandProfile(tenantId: string) {
  const [profile] = await db.insert(brandProfiles).values({
    tenantId,
    businessName: 'Acme Health',
    tagline: 'Care that answers',
    industry: 'Healthcare',
    description: 'Helpful clinic',
    website: 'https://example.com',
    email: 'hello@example.com',
    phone: '+15550001111',
    addresses: [],
    services: [],
    policies: [],
    faqs: [],
    staff: [],
    brandVoice: { toneKeywords: [], wordsToUse: [], wordsToAvoid: [], samplePhrases: [] },
    escalationRules: [],
  }).returning();

  return requireInserted(profile, 'brand profile');
}

export async function createAssistant(tenantId: string) {
  const [assistant] = await db.insert(aiAssistants).values({
    tenantId,
    primaryLanguage: 'en',
    multilingualEnabled: false,
  }).returning();

  return requireInserted(assistant, 'assistant');
}

export async function createPhoneNumber(tenantId: string, number: string) {
  await db.insert(phoneNumbers).values({
    tenantId,
    number,
    provider: 'twilio',
    isActive: true,
  });
}

export function jsonHeaders(cookie?: string) {
  return {
    'content-type': 'application/json',
    'x-requested-with': 'XMLHttpRequest',
    ...(cookie ? { cookie } : {}),
  };
}

export function extractCookie(setCookieHeader: string | string[] | undefined) {
  const raw = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return raw?.split(';')[0] ?? '';
}
