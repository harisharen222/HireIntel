import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { audit, logger } from '../config/logger';
import { aiClient } from '../services/aiClient';
import { badRequest, forbidden, notFound } from '../utils/errors';
import type { RunMatchInput } from '../validators/schemas';

// POST /api/match/run
export const runMatch = async (
  req: Request<unknown, unknown, RunMatchInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startedAt = Date.now();
  try {
    if (!req.user) throw forbidden();
    const { cvId, jobId, topK } = req.body;

    // Object-level authz: candidate can only match their own CVs;
    // recruiter can only match against their own jobs.
    if (cvId) {
      const cv = await prisma.cv.findUnique({ where: { id: cvId } });
      if (!cv) throw notFound('CV not found');
      if (req.user.role === 'CANDIDATE' && cv.userId !== req.user.id) throw forbidden();
    }
    if (jobId) {
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) throw notFound('Job not found');
      if (req.user.role === 'RECRUITER' && job.recruiterId !== req.user.id) throw forbidden();
    }

    audit('match.started', {
      userId: req.user.id,
      metadata: { cvId, jobId, topK },
      ip: req.ip,
    });

    const matches = await aiClient.match({ cvId, jobId, topK });

    // Persist the run + its results for auditability and the recruiter dashboard.
    const matchRun = await prisma.matchRun.create({
      data: {
        userId: req.user.id,
        cvId,
        jobId,
        topK,
        durationMs: Date.now() - startedAt,
        results: {
          create: matches.map((m) => ({
            cvId: cvId ?? m.jobId, // for job->candidates mode, AI service returns cvId in jobId field — see note in match.py
            jobId: jobId ?? m.jobId,
            semanticSimilarity: m.semanticSimilarity,
            skillOverlap: m.skillOverlap,
            experienceFit: m.experienceFit,
            finalScore: m.finalScore,
            matchedSkills: m.matchedSkills,
            missingSkills: m.missingSkills,
            verdict: m.verdict,
          })),
        },
      },
      include: { results: true },
    });

    audit('match.completed', {
      userId: req.user.id,
      metadata: { runId: matchRun.id, count: matches.length, durationMs: matchRun.durationMs },
      ip: req.ip,
    });

    res.json({ runId: matchRun.id, matches });
  } catch (err) {
    logger.error({ err }, 'match run failed');
    next(err);
  }
};

// GET /api/match/history
export const listMyMatchRuns = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw forbidden();
    const runs = await prisma.matchRun.findMany({
      where: { userId: req.user.id },
      include: {
        results: {
          orderBy: { finalScore: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ runs });
  } catch (err) {
    next(err);
  }
};

// GET /api/match/:runId/export.csv
export const exportRunCsv = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw forbidden();
    const run = await prisma.matchRun.findUnique({
      where: { id: req.params.runId },
      include: {
        results: {
          orderBy: { finalScore: 'desc' },
          include: {
            job: { select: { title: true, company: true } },
          },
        },
      },
    });
    if (!run) throw notFound('Match run not found');
    if (run.userId !== req.user.id && req.user.role !== 'ADMIN') throw forbidden();
    if (run.results.length === 0) throw badRequest('No results to export');

    const header = [
      'rank',
      'jobId',
      'jobTitle',
      'company',
      'finalScore',
      'semanticSimilarity',
      'skillOverlap',
      'experienceFit',
      'verdict',
      'matchedSkills',
      'missingSkills',
    ].join(',');

    const rows = run.results.map((r, i) =>
      [
        i + 1,
        r.jobId,
        csvEscape(r.job?.title ?? ''),
        csvEscape(r.job?.company ?? ''),
        r.finalScore.toFixed(4),
        r.semanticSimilarity.toFixed(4),
        r.skillOverlap.toFixed(4),
        r.experienceFit.toFixed(4),
        r.verdict,
        csvEscape(r.matchedSkills.join(';')),
        csvEscape(r.missingSkills.join(';')),
      ].join(',')
    );

    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="match-run-${run.id}.csv"`
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

const csvEscape = (s: string): string => {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};
