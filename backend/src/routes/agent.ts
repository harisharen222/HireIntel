import { Router } from 'express';
import axios from 'axios';
import { requireAuth } from '../middleware/auth';
import { env } from '../config/env';
import { logger, audit } from '../config/logger';

const router = Router();

// Require RECRUITER or ADMIN role for agent runs
router.use(requireAuth);
router.use((req, res, next) => {
  if (req.user?.role !== 'RECRUITER' && req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

router.post('/run', async (req, res, next) => {
  try {
    const { jobId, topK } = req.body;
    
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    audit('agent.run', { userId: req.user!.id, metadata: { jobId, topK }, ip: req.ip });

    const response = await axios.post(
      `${env.AI_SERVICE_URL}/agent/run`,
      { job_id: jobId, top_k: topK ?? 5 },
      {
        headers: {
          'X-Internal-API-Key': env.INTERNAL_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json(response.data);
  } catch (err: any) {
    logger.error({ err }, 'Agent run failed');
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    next(err);
  }
});

export const agentRoutes = router;
