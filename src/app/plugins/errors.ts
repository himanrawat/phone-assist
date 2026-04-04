import type { FastifyInstance } from 'fastify';
import { ZodError, z } from 'zod';
import { AppError } from '../../shared/errors/app-error.js';

export async function registerErrorPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error({
      err: error,
      requestId: request.id,
      userId: request.user?.id ?? null,
      tenantId: request.tenant?.id ?? null,
    }, 'Request failed');

    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
        details: error.details,
      });
      return;
    }

    if (error instanceof ZodError) {
      reply.status(400).send({
        error: 'Invalid request payload.',
        code: 'validation_error',
        details: z.flattenError(error),
      });
      return;
    }

    reply.status(500).send({
      error: 'Internal server error.',
      code: 'internal_server_error',
    });
  });
}
