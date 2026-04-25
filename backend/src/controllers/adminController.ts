import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

// GET /api/admin/analytics
export const analytics = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [users, cvs, jobs, matchRuns, scoreDist] = await Promise.all([
      prisma.user.count(),
      prisma.cv.count(),
      prisma.job.count({ where: { status: 'OPEN' } }),
      prisma.matchRun.count(),
      // Verdict distribution across all match results.
      prisma.matchResult.groupBy({
        by: ['verdict'],
        _count: { _all: true },
      }),
    ]);

    // 7-day user signups.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = await prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    res.json({
      totals: { users, cvs, openJobs: jobs, matchRuns },
      recent: { usersLast7Days: recentUsers },
      verdictDistribution: scoreDist.map((d) => ({
        verdict: d.verdict,
        count: d._count._all,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users?cursor=&limit=
export const listUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const cursor = req.query.cursor as string | undefined;

    const users = await prisma.user.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        _count: { select: { cvs: true, jobsPosted: true } },
      },
    });

    const hasMore = users.length > limit;
    const page = hasMore ? users.slice(0, -1) : users;

    res.json({
      users: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  } catch (err) {
    next(err);
  }
};
