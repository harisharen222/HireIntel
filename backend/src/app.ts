import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { env, isProd } from './config/env';
import { logger } from './config/logger';
import { openapiSpec } from './config/openapi';

import { globalLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import cvRoutes from './routes/cvRoutes';
import jobRoutes from './routes/jobRoutes';
import { matchRouter, adminRouter } from './routes/index';

export const buildApp = (): Express => {
  const app = express();

  // Behind a reverse proxy in prod (nginx / ALB). Needed so req.ip reflects
  // the real client, not the proxy, for rate-limit keying.
  app.set('trust proxy', 1);

  // ---------- Security middleware ----------
  app.use(
    helmet({
      // Let the React frontend load normally while keeping sane defaults.
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              connectSrc: ["'self'", env.FRONTEND_URL],
              imgSrc: ["'self'", 'data:'],
              // Vite injects inline styles; allow in prod only if you've inlined them into a stylesheet.
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request logging with Pino; auto-generates a request id.
  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res, err) => {
        if (err) return 'error';
        if (res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    })
  );

  // ---------- Health ----------
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'backend', version: '1.0.0' });
  });

  // ---------- Rate limiter (global) ----------
  app.use('/api', globalLimiter);

  // ---------- API docs ----------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec as any));

  // ---------- Routes ----------
  app.use('/api/auth', authRoutes);
  app.use('/api/cv', cvRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/match', matchRouter);
  app.use('/api/admin', adminRouter);

  // ---------- 404 + error handler ----------
  app.use((_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  app.use(errorHandler);

  return app;
};
