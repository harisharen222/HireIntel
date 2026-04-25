import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { audit } from '../config/logger';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../utils/jwt';
import { setAuthCookies, clearAuthCookies, COOKIE_NAMES } from '../utils/cookies';
import { conflict, unauthorized } from '../utils/errors';
import type { RegisterInput, LoginInput } from '../validators/schemas';

const BCRYPT_COST = 12;
const MAX_FAILED_LOGINS = 10;
const LOCKOUT_MINUTES = 30;

const clientInfo = (req: Request) => ({
  ip: req.ip,
  userAgent: req.get('user-agent') ?? undefined,
});

const issueSession = async (
  res: Response,
  user: { id: string; email: string; role: 'CANDIDATE' | 'RECRUITER' | 'ADMIN' },
  req: Request
) => {
  const access = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const { plain, hash } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      tokenHash: hash,
      userId: user.id,
      expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
      ip: req.ip,
      userAgent: req.get('user-agent') ?? null,
    },
  });

  setAuthCookies(res, access, plain);
};

// POST /api/auth/register
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, fullName, role } = req.body;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) throw conflict('An account with this email already exists');

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash, fullName, role },
      select: { id: true, email: true, role: true, fullName: true },
    });

    await issueSession(res, user, req);
    audit('register.success', { userId: user.id, ...clientInfo(req) });

    res.status(201).json({
      user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Uniform error message regardless of whether the user exists or the password was wrong.
    // This prevents user enumeration via the login endpoint.
    const generic = unauthorized('Invalid credentials');

    if (!user || !user.isActive) {
      // Still spend time on a bcrypt compare to equalize timing against the real path.
      await bcrypt.compare(password, '$2b$12$' + 'x'.repeat(53));
      throw generic;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      audit('login.locked', { userId: user.id, ...clientInfo(req) });
      throw unauthorized('Account temporarily locked. Try again later.');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      const attempts = user.failedLoginAttempts + 1;
      const locked = attempts >= MAX_FAILED_LOGINS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: locked ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
        },
      });
      audit('login.failed', {
        userId: user.id,
        metadata: { attempts, locked },
        ...clientInfo(req),
      });
      throw generic;
    }

    // Reset failure counters on success.
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    await issueSession(res, user, req);
    audit('login.success', { userId: user.id, ...clientInfo(req) });

    res.json({
      user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const plain = req.cookies?.[COOKIE_NAMES.REFRESH];
    if (!plain) throw unauthorized('Missing refresh token');

    const tokenHash = hashRefreshToken(plain);
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw unauthorized('Refresh token invalid or expired');
    }

    // Rotate: revoke the old row, issue a new pair.
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    await issueSession(res, record.user, req);
    audit('refresh.rotated', { userId: record.userId, ...clientInfo(req) });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const plain = req.cookies?.[COOKIE_NAMES.REFRESH];
    if (plain) {
      const tokenHash = hashRefreshToken(plain);
      await prisma.refreshToken
        .update({ where: { tokenHash }, data: { revokedAt: new Date() } })
        .catch(() => undefined); // ignore if already gone
    }
    clearAuthCookies(res);
    if (req.user) audit('logout', { userId: req.user.id, ...clientInfo(req) });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw unauthorized();
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, role: true, fullName: true, createdAt: true },
    });
    if (!user) throw unauthorized();
    res.json({ user });
  } catch (err) {
    next(err);
  }
};


