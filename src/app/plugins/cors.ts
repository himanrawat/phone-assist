import type { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import { allowedOrigins } from '../../shared/config/env.js';

export async function registerCorsPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyCors, {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-Requested-With'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });
}
