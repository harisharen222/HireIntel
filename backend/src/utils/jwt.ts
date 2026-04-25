import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import type { Role } from '@prisma/client';

export interface AccessPayload {
  sub: string;        // user id
  role: Role;
  email: string;
}

export const signAccessToken = (payload: AccessPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });

export const verifyAccessToken = (token: string): AccessPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof decoded === 'string') throw new Error('invalid token payload');
  return decoded as AccessPayload;
};

/**
 * Refresh tokens are opaque (not JWTs) so we can revoke them by deleting the DB row.
 * We store only the SHA-256 hash server-side — if the DB is leaked, the tokens
 * themselves aren't recoverable.
 */
export const generateRefreshToken = (): { plain: string; hash: string } => {
  const plain = crypto.randomBytes(48).toString('base64url');
  const hash = crypto.createHash('sha256').update(plain).digest('hex');
  return { plain, hash };
};

export const hashRefreshToken = (plain: string): string =>
  crypto.createHash('sha256').update(plain).digest('hex');
