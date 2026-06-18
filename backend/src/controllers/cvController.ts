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
    const parsed = await aiClient.parse(req.file.buffer, req.file.originalname);
    if (!parsed.text || parsed.text.length < 200) {
      throw badRequest(
        'Could not extract text from this PDF. It may be scanned or password-protected.'
      );
    }
    const embed = await aiClient.embed(parsed.text);

    const filename = req.file!.originalname.slice(0, 200);

    const cv = await prisma.cv.create({
      data: {
        id: cvId,
        userId: req.user.id,
        originalFilename: filename,
        storagePath: saved.storagePath,
        rawText: parsed.text,
        skills: parsed.skills,
        yearsExperience: parsed.yearsExperience,
      }
    });

    // Save vector to MongoDB Atlas via AI service
    await aiClient.upsertVector({
      doc_id: cvId,
      vector: embed.embedding,
      metadata: {},
      collection: 'cvs'
    });



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
    await aiClient.deleteVector('cvs', cv.id).catch(err => logger.warn({ err }, 'Failed to delete vector from Mongo'));
    audit('cv.deleted', { userId: req.user.id, metadata: { cvId: cv.id }, ip: req.ip });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
