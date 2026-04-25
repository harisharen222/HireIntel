import pino from 'pino';
import { env, isProd } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  // Strip anything that looks like a secret before it's written.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-csrf-token"]',
      'req.headers["x-internal-api-key"]',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
      '*.jwt',
    ],
    censor: '[REDACTED]',
  },
  transport: isProd
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } },
});

/**
 * Separate audit channel — same underlying logger but distinguished by
 * `kind: 'audit'` so a SIEM / log pipeline can route it differently.
 */
export const audit = (
  action: string,
  data: {
    userId?: string;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  } = {}
) => {
  logger.info({ kind: 'audit', action, ...data }, `audit:${action}`);
};
