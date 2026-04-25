import { Router } from 'express';
import multer from 'multer';
import * as c from '../controllers/cvController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { uploadLimiter } from '../middleware/rateLimit';
import { env } from '../config/env';

const router = Router();

/**
 * Memory storage so we can run magic-byte + MIME sniff checks BEFORE
 * anything touches disk. Only validated bytes make it into UPLOAD_DIR.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    // First-pass filter — extension + declared type. Real validation is in
    // the service layer (magic bytes + file-type sniff).
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF uploads are allowed'));
    }
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      return cb(new Error('File must have a .pdf extension'));
    }
    cb(null, true);
  },
});

router.post(
  '/upload',
  requireAuth,
  requireRole('CANDIDATE', 'ADMIN'),
  uploadLimiter,
  upload.single('file'),
  c.uploadCv
);

router.get('/mine', requireAuth, requireRole('CANDIDATE', 'ADMIN'), c.listMyCvs);
router.get('/:id', requireAuth, c.getCv);
router.delete('/:id', requireAuth, c.deleteCv);

export default router;
