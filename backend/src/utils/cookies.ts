import type { Response } from 'express';
import { env, isProd } from '../config/env';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

const baseCookieOpts = {
  httpOnly: true,
  secure: isProd,                    // only over HTTPS in prod
  sameSite: 'none' as const,         // must be 'none' for cross-domain cookies (Vercel -> Render)
  path: '/',
};

export const setAuthCookies = (res: Response, access: string, refresh: string): void => {
  res.cookie(ACCESS_COOKIE, access, {
    ...baseCookieOpts,
    maxAge: 15 * 60 * 1000,          // 15 min
  });
  res.cookie(REFRESH_COOKIE, refresh, {
    ...baseCookieOpts,
    maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie(ACCESS_COOKIE, baseCookieOpts);
  res.clearCookie(REFRESH_COOKIE, baseCookieOpts);
};

export const COOKIE_NAMES = { ACCESS: ACCESS_COOKIE, REFRESH: REFRESH_COOKIE };
