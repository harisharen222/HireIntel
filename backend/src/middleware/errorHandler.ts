import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/errors';
import { logger } from '../config/logger';
import { isProd } from '../config/env';

/**
 * Centralized error handler. All controller errors flow here.
 * In prod we never leak stack traces or raw messages — just a stable
 * code + friendly message. Dev logs get the full picture.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // Unexpected — log full context, return generic.
  logger.error(
    {
      err,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
    },
    'unhandled error'
  );

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'An unexpected error occurred' : String((err as Error)?.message ?? err),
    },
  });
};
