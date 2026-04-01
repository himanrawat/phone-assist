import Fastify from 'fastify';
import fastifyWebSocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import { env } from './config/env.js';

// Routes
import { twilioWebhookRoutes } from './routes/webhooks/twilio.webhook.js';
import { callStreamWebSocket } from './routes/webhooks/call-stream.ws.js';
import { callRoutes } from './routes/calls/calls.routes.js';
import { providerRoutes } from './routes/admin/provider.routes.js';
import { startWorkers } from './queue/workers.js';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
      transport: env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // Plugins
  await fastify.register(fastifyWebSocket);
  await fastify.register(fastifyCors, {
    origin: env.NODE_ENV === 'development' ? true : [],
  });
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false, // Disable for development
  });

  // Parse URL-encoded bodies (Twilio sends form-encoded webhooks)
  fastify.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_req, body, done) => {
      const params = new URLSearchParams(body as string);
      const result: Record<string, string> = {};
      params.forEach((value, key) => { result[key] = value; });
      done(null, result);
    }
  );

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  }));

  // Register routes
  await fastify.register(twilioWebhookRoutes);
  await fastify.register(callStreamWebSocket);
  await fastify.register(callRoutes);
  await fastify.register(providerRoutes);

  return fastify;
}

const server = await buildServer();

try {
  startWorkers();
  await server.listen({ port: env.PORT, host: env.HOST });
  console.log(`\nServer running at http://${env.HOST}:${env.PORT}`);
  console.log(`Telephony: ${env.TELEPHONY_PROVIDER}`);
  console.log(`STT: ${env.STT_PROVIDER}`);
  console.log(`TTS: ${env.TTS_PROVIDER}`);
  console.log(`LLM: ${env.LLM_PROVIDER}\n`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
