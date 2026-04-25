import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { audit, logger } from '../config/logger';
import { saveUploadedPdf } from '../services/fileService';
import { aiClient } from '../services/aiClient';
import { badRequest, forbidden, notFound } from '../utils/errors';

// POST /api/cv/upload   (multer: req.file)
export const uploadCv = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw forbidden();
    if (!req.file) throw badRequest('No file provided');

    // Generate a server-side id up front so we can name the file.
    const cvId = `cv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

    const saved = await saveUploadedPdf(
      req.user.id,
      cvId,
      req.file.buffer,
      req.file.mimetype
    );

    // Call AI service: parse → embed
    const parsed = await aiClient.parse(saved.storagePath);
    if (!parsed.text || parsed.text.length < 200) {
      throw badRequest(
        'Could not extract text from this PDF. It may be scanned or password-protected.'
      );
    }
    const embed = await aiClient.embed(parsed.text);

    // Persist atomically. Prisma doesn't natively support vector writes in `create`,
    // so we do a two-step: create with placeholder, then raw-UPDATE the embedding.
    const filename = req.file!.originalname.slice(0, 200);
    const embeddingLiteral = `[${embed.embedding.join(',')}]`;

    await prisma.$executeRaw`
      INSERT INTO cvs (
        id, "userId", "originalFilename", "storagePath",
        "rawText", skills, "yearsExperience", embedding,
        "createdAt", "updatedAt"
      ) VALUES (
        ${cvId}, ${req.user!.id}, ${filename}, ${saved.storagePath},
        ${parsed.text}, ${parsed.skills}::text[], ${parsed.yearsExperience},
        ${embeddingLiteral}::vector,
        NOW(), NOW()
      )
    `;

    const cv = {
      id: cvId,
      skills: parsed.skills,
      yearsExperience: parsed.yearsExperience,
      createdAt: new Date(),
    };

    audit('cv.uploaded', {
      userId: req.user.id,
      metadata: { cvId: cv.id, sizeBytes: saved.sizeBytes, skillsCount: parsed.skills.length },
      ip: req.ip,
    });

    res.status(201).json({
      cvId: cv.id,
      filename: req.file.originalname,
      extractedSkills: cv.skills,
      yearsExperience: cv.yearsExperience,
      embeddingDim: embed.dim,
      processedAt: cv.createdAt,
    });
  } catch (err) {
    logger.error({ err }, 'cv upload failed');
    next(err);
  }
};

// GET /api/cv/mine
export const listMyCvs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw forbidden();
    const cvs = await prisma.cv.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        originalFilename: true,
        skills: true,
        yearsExperience: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ cvs });
  } catch (err) {
    next(err);
  }
};

// GET /api/cv/:id
export const getCv = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw forbidden();
    const cv = await prisma.cv.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        userId: true,
        originalFilename: true,
        skills: true,
        yearsExperience: true,
        createdAt: true,
      },
    });
    if (!cv) throw notFound('CV not found');
    // Object-level authz: a candidate can only see their own CV.
    // Recruiters and admins can view any CV (used in match detail pages).
    if (req.user.role === 'CANDIDATE' && cv.userId !== req.user.id) {
      throw forbidden();
    }
    res.json({ cv });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/cv/:id
export const deleteCv = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw forbidden();
    const cv = await prisma.cv.findUnique({ where: { id: req.params.id } });
    if (!cv) throw notFound('CV not found');
    if (cv.userId !== req.user.id && req.user.role !== 'ADMIN') throw forbidden();

    await prisma.cv.delete({ where: { id: cv.id } });
    audit('cv.deleted', { userId: req.user.id, metadata: { cvId: cv.id }, ip: req.ip });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
