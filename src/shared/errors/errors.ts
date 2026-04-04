import { AppError } from './app-error.js';

export function badRequest(message: string, details?: unknown) {
  return new AppError({ code: 'bad_request', statusCode: 400, message, details });
}

export function unauthorized(message = 'Authentication required.') {
  return new AppError({ code: 'unauthorized', statusCode: 401, message });
}

export function forbidden(message = 'You do not have permission to perform this action.') {
  return new AppError({ code: 'forbidden', statusCode: 403, message });
}

export function notFound(message = 'Resource not found.') {
  return new AppError({ code: 'not_found', statusCode: 404, message });
}

export function conflict(message: string, details?: unknown) {
  return new AppError({ code: 'conflict', statusCode: 409, message, details });
}

export function rateLimited(message = 'Too many requests. Please try again later.') {
  return new AppError({ code: 'rate_limited', statusCode: 429, message });
}
