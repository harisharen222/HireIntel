import { Router } from 'express';
import * as c from '../controllers/jobController';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validateBody } from '../middleware/validate';
import { createJobSchema, updateJobSchema } from '../validators/schemas';

const router = Router();

// Public listing — anyone can browse open jobs.
router.get('/', optionalAuth, c.listOpenJobs);

router.get('/mine', requireAuth, requireRole('RECRUITER', 'ADMIN'), c.listMyJobs);
router.get('/:id', optionalAuth, c.getJob);

router.post(
  '/',
  requireAuth,
  requireRole('RECRUITER', 'ADMIN'),
  validateBody(createJobSchema),
  c.createJob
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('RECRUITER', 'ADMIN'),
  validateBody(updateJobSchema),
  c.updateJob
);

router.delete('/:id', requireAuth, requireRole('RECRUITER', 'ADMIN'), c.deleteJob);

export default router;
