import 'dotenv/config';
import { z } from 'zod';

/**
 * Typed env loader. Fails fast at startup if something is missing or malformed —
 * much better than discovering a misconfigured JWT_SECRET on the first login.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().default(7),

  AI_SERVICE_URL: z.string().url(),
  INTERNAL_API_KEY: z.string().min(32, 'INTERNAL_API_KEY must be at least 32 chars'),

  FRONTEND_URL: z.string().url(),

  UPLOAD_DIR: z.string().default('/data/uploads'),
  MAX_UPLOAD_BYTES: z.coerce.number().default(5 * 1024 * 1024),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
