import type { FastifyInstance } from 'fastify';
import { env } from '../../shared/config/env.js';
import { badRequest, forbidden } from '../../shared/errors/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function getOriginFromReferer(referer: string | undefined) {
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export async function registerCsrfPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request) => {
    if (SAFE_METHODS.has(request.method)) {
      return;
    }

    if (!request.url.startsWith('/api/')) {
      return;
    }

    const origin = request.headers.origin || getOriginFromReferer(request.headers.referer);
    if (origin && origin !== env.APP_URL && origin !== env.WEB_URL) {
      throw forbidden('Origin is not allowed.');
    }

    if (!origin && env.NODE_ENV === 'production') {
      throw forbidden('Origin header is required for mutating API requests.');
    }

    const requestedWith = request.headers['x-requested-with'];
    if (requestedWith !== 'XMLHttpRequest') {
      throw badRequest('Missing X-Requested-With header.');
    }
  });
}
