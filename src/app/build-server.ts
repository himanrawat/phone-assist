import Fastify from 'fastify';
import fastifyWebSocket from '@fastify/websocket';
import { sql } from 'drizzle-orm';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { brandRoutes } from '../modules/brand-profiles/brand.routes.js';
import { assistantRoutes } from '../modules/assistant-settings/assistant.routes.js';
import { callRoutes } from '../modules/calls/calls.routes.js';
import { providerRoutes } from '../modules/providers/providers.routes.js';
import { twilioWebhookRoutes } from '../modules/webhooks/twilio.webhook.js';
import { callStreamWebSocket } from '../modules/webhooks/call-stream.ws.js';
import { tenantRoutes } from '../modules/tenants/tenants.routes.js';
import { membershipRoutes } from '../modules/memberships/memberships.routes.js';
import { workingHoursRoutes } from '../modules/working-hours/hours.routes.js';
import { phoneNumberRoutes } from '../modules/phone-numbers/numbers.routes.js';
import { contactRoutes } from '../modules/contacts/contacts.routes.js';
import { providerConfigService } from '../modules/providers/providers.service.js';
import { db } from '../shared/config/database.js';
import { redis } from '../shared/config/redis.js';
import { env } from '../shared/config/env.js';
import { ensureDatabaseSchema } from '../shared/db/ensure-schema.js';
import { loggerOptions } from '../shared/logging/logger.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { registerCorsPlugin } from './plugins/cors.js';
import { registerCsrfPlugin } from './plugins/csrf.js';
import { registerErrorPlugin } from './plugins/errors.js';
import { registerHelmetPlugin } from './plugins/helmet.js';
import { registerLoggingPlugin } from './plugins/logging.js';
import { registerRateLimitPlugin } from './plugins/rate-limit.js';
import { registerRequestContextPlugin } from './plugins/request-context.js';

export async function buildServer() {
  await ensureDatabaseSchema();

  const fastify = Fastify({
    logger: loggerOptions,
    requestIdHeader: 'x-request-id',
  });

  await fastify.register(fastifyWebSocket);
  await registerCorsPlugin(fastify);
  await registerHelmetPlugin(fastify);
  await registerRequestContextPlugin(fastify);
  registerLoggingPlugin(fastify);
  await registerRateLimitPlugin(fastify);
  await registerAuthPlugin(fastify);
  await registerCsrfPlugin(fastify);

  fastify.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_request, body, done) => {
      const params = new URLSearchParams(body as string);
      const result: Record<string, string> = {};
      params.forEach((value, key) => {
        result[key] = value;
      });
      done(null, result);
    }
  );

  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  }));

  fastify.get('/ready', async (_request, reply) => {
    try {
      await db.execute(sql`select 1`);
      if (redis.status === 'wait') {
        await redis.connect();
      }
      await redis.ping();

      reply.send({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      reply.status(503).send({
        status: 'not_ready',
        error: error instanceof Error ? error.message : 'Unknown readiness error',
      });
    }
  });

  await providerConfigService.load();

  await fastify.register(authRoutes);
  await fastify.register(twilioWebhookRoutes);
  await fastify.register(callStreamWebSocket);
  await fastify.register(callRoutes);
  await fastify.register(brandRoutes);
  await fastify.register(assistantRoutes);
  await fastify.register(providerRoutes);
  await fastify.register(tenantRoutes);
  await fastify.register(membershipRoutes);
  await fastify.register(workingHoursRoutes);
  await fastify.register(phoneNumberRoutes);
  await fastify.register(contactRoutes);
  await registerErrorPlugin(fastify);

  return fastify;
}
