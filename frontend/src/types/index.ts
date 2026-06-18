export type Role = 'CANDIDATE' | 'RECRUITER' | 'ADMIN';
export type JobStatus = 'OPEN' | 'CLOSED' | 'DRAFT';
export type Verdict = 'STRONG_FIT' | 'MEDIUM_FIT' | 'WEAK_FIT';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface Cv {
  id: string;
  originalFilename: string;
  skills: string[];
  yearsExperience: number;
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  minYears: number;
  location?: string;
  status: JobStatus;
  createdAt: string;
}

export interface MatchResult {
  jobId: string;
  jobTitle: string;
  company: string;
  semanticSimilarity: number;
  skillOverlap: number;
  experienceFit: number;
  finalScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  verdict: Verdict;
}

export * from './agent';

export interface AnalyticsData {
  totals: {
    users: number;
    cvs: number;
    openJobs: number;
    matchRuns: number;
  };
  recent: {
    usersLast7Days: number;
  };
  verdictDistribution: Array<{ verdict: Verdict; count: number }>;
}
