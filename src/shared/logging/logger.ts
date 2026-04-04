import pino from 'pino';
import { env } from '../config/env.js';

const transport = env.NODE_ENV === 'development'
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
      },
    }
  : undefined;

export const loggerOptions = {
  level: env.NODE_ENV === 'development' ? 'info' : 'warn',
  transport,
};

export const logger = pino(loggerOptions);
