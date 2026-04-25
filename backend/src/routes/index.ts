import { Router } from 'express';
import * as match from '../controllers/matchController';
import * as admin from '../controllers/adminController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validateBody } from '../middleware/validate';
import { matchLimiter } from '../middleware/rateLimit';
import { runMatchSchema } from '../validators/schemas';

const matchRouter = Router();
matchRouter.post(
  '/run',
  requireAuth,
  matchLimiter,
  validateBody(runMatchSchema),
  match.runMatch
);
matchRouter.get('/history', requireAuth, match.listMyMatchRuns);
matchRouter.get('/:runId/export.csv', requireAuth, match.exportRunCsv);

const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('ADMIN'));
adminRouter.get('/analytics', admin.analytics);
adminRouter.get('/users', admin.listUsers);

export { matchRouter, adminRouter };
