import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { unauthorized } from '../utils/errors';
import { COOKIE_NAMES } from '../utils/cookies';
import type { Role } from '@prisma/client';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
    }
  }
}

/**
 * Require a valid access JWT from the HttpOnly cookie.
 * Never reads Authorization header — we don't support bearer tokens on purpose
 * so there's exactly one auth path to audit.
 */
export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = req.cookies?.[COOKIE_NAMES.ACCESS];
  if (!token) return next(unauthorized('Missing access token'));

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    // Don't leak whether it was expired, malformed, or bad signature.
    next(unauthorized('Invalid or expired session'));
  }
};

/**
 * Optional-auth variant for endpoints that behave differently when logged in
 * but don't require it. Doesn't throw on missing/invalid cookie.
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = req.cookies?.[COOKIE_NAMES.ACCESS];
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    /* ignore */
  }
  next();
};
