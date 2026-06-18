import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { logger, audit } from '../config/logger';
import { aiClient } from '../services/aiClient';
import { forbidden, notFound } from '../utils/errors';
import type { CreateJobInput, UpdateJobInput } from '../validators/schemas';

// POST /api/jobs
export const createJob = async (
  req: Request<unknown, unknown, CreateJobInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw forbidden();

    const { title, description, requiredSkills } = req.body;

    const embedInput = [title, requiredSkills.join(', '), description].join('\n');
    const embed = await aiClient.embed(embedInput);

    const jobId = `job_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

    const { company, minYears, location, status } = req.body;
    const skills = requiredSkills;
    const desc = description;
    const created = await prisma.job.create({
      data: {
        id: jobId,
        recruiterId: req.user.id,
        title,
        company,
        description: desc,
        requiredSkills: skills,
        minYears: minYears ?? 0,
        location: location ?? null,
        status: status ?? 'OPEN',
      }
    });

    await aiClient.upsertVector({
      doc_id: jobId,
      vector: embed.embedding,
      metadata: {},
      collection: 'jobs'
    });


    audit('job.created', { userId: req.user.id, metadata: { jobId: created.id }, ip: req.ip });

    res.status(201).json({ job: stripEmbedding(created) });
  } catch (err) {
    next(err);
  }
};

// GET /api/jobs   (public — lists OPEN jobs)
export const listOpenJobs = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobs = await prisma.job.findMany({
      where: { status: 'OPEN' },
      select: {
        id: true,
        title: true,
        company: true,
        description: true,
        requiredSkills: true,
        minYears: true,
        location: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
};

// GET /api/jobs/mine   (recruiter-scoped)
export const listMyJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw forbidden();
    const jobs = await prisma.job.findMany({
      where: { recruiterId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ jobs: jobs.map(stripEmbedding) });
  } catch (err) {
    next(err);
  }
};

// GET /api/jobs/:id
export const getJob = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw notFound('Job not found');
    res.json({ job: stripEmbedding(job) });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/jobs/:id
export const updateJob = async (
  req: Request<{ id: string }, unknown, UpdateJobInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw forbidden();
    const existing = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Job not found');
    if (existing.recruiterId !== req.user.id && req.user.role !== 'ADMIN') {
      throw forbidden();
    }

    // Re-embed only if title / description / requiredSkills changed.
    const changedEmbedding =
      req.body.title !== undefined ||
      req.body.description !== undefined ||
      req.body.requiredSkills !== undefined;

    const next = {
      ...existing,
      ...req.body,
    };

    await prisma.job.update({
      where: { id: existing.id },
      data: { ...req.body },
    });

    if (changedEmbedding) {
      const embedInput = [next.title, next.requiredSkills.join(', '), next.description].join(
        '\n'
      );
      const embed = await aiClient.embed(embedInput);
      await aiClient.upsertVector({
        doc_id: existing.id,
        vector: embed.embedding,
        metadata: {},
        collection: 'jobs'
      });
    }

    audit('job.updated', {
      userId: req.user.id,
      metadata: { jobId: existing.id, reEmbedded: changedEmbedding },
      ip: req.ip,
    });

    const updated = await prisma.job.findUnique({ where: { id: existing.id } });
    res.json({ job: stripEmbedding(updated!) });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/jobs/:id
export const deleteJob = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw forbidden();
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw notFound('Job not found');
    if (job.recruiterId !== req.user.id && req.user.role !== 'ADMIN') throw forbidden();

    await prisma.job.delete({ where: { id: job.id } });
    await aiClient.deleteVector('jobs', job.id).catch(err => logger.warn({ err }, 'Failed to delete vector from Mongo'));
    audit('job.deleted', { userId: req.user.id, metadata: { jobId: job.id }, ip: req.ip });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Never expose the raw 384-dim embedding to the client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripEmbedding = (row: any): any => {
  if (!row) return row;
  const { embedding, ...rest } = row;
  return rest;
};
