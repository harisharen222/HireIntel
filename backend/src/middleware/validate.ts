import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Parses and replaces req.body with the Zod-validated value.
 * Zod's `strict()` could reject unknown keys, but we use the default behavior
 * which *strips* them — defense in depth: even if a field sneaks past, it
 * never reaches the controller.
 */
export const validateBody =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse(req.body);
    req.body = parsed;
    next();
  };

export const validateQuery =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse(req.query);
    (req as unknown as { query: T }).query = parsed;
    next();
  };
