import rateLimit from 'express-rate-limit';
import { tooMany } from '../utils/errors';

const handler = (_req: unknown, _res: unknown, next: (e: unknown) => void) => {
  next(tooMany('Rate limit exceeded. Try again later.'));
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

/**
 * Stricter limiter keyed by IP + email for login specifically.
 * Prevents a single attacker from credential-stuffing many accounts
 * without being slowed down.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => {
    const email = (req.body?.email as string | undefined) ?? '';
    return `${req.ip}:${email.toLowerCase()}`;
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anon',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

export const matchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anon',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});
