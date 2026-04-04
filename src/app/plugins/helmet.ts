import type { FastifyInstance } from 'fastify';
import fastifyHelmet from '@fastify/helmet';

export async function registerHelmetPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false,
  });
}
