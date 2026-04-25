import { Router } from 'express';
import * as c from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { authLimiter, loginLimiter } from '../middleware/rateLimit';
import { registerSchema, loginSchema } from '../validators/schemas';

const router = Router();

router.post('/register', authLimiter, validateBody(registerSchema), c.register);
router.post('/login', loginLimiter, validateBody(loginSchema), c.login);
router.post('/refresh', authLimiter, c.refresh);
router.post('/logout', c.logout);
router.get('/me', requireAuth, c.me);

export default router;
