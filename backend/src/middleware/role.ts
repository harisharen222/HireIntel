import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';
import { forbidden, unauthorized } from '../utils/errors';

/**
 * Gate a route to one or more roles. Must come AFTER requireAuth.
 *
 * Usage: router.get('/admin/users', requireAuth, requireRole('ADMIN'), handler)
 */
export const requireRole =
  (...allowed: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized());
    if (!allowed.includes(req.user.role)) return next(forbidden());
    next();
  };
