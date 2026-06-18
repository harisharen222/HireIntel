import axios, { AxiosError, AxiosInstance } from 'axios';
import type {
  User,
  Cv,
  Job,
  MatchResult,
  AnalyticsData,
  Role,
  JobStatus,
  AgentRunResponse,
} from '@/types';

/**
 * Axios instance wired for cookie-based sessions.
 *
 * `withCredentials: true` tells the browser to send HttpOnly cookies on
 * cross-origin requests. Combined with the backend's strict CORS + explicit
 * frontend origin, this keeps auth state entirely server-side.
 */
export const client: AxiosInstance = axios.create({
  baseURL: (import.meta as any).env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 30_000,
});

/**
 * One-shot refresh on 401. If refresh itself 401s, the user is really gone.
 * A small flag prevents infinite loops when /auth/refresh returns 401.
 */
let isRefreshing = false;

client.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !isRefreshing &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login')
    ) {
      isRefreshing = true;
      try {
        await client.post('/auth/refresh');
        isRefreshing = false;
        return client(original);
      } catch {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ---------- Auth ----------

export const authApi = {
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    role: Role;
  }) => client.post<{ user: User }>('/auth/register', data).then((r) => r.data),

  login: (email: string, password: string) =>
    client.post<{ user: User }>('/auth/login', { email, password }).then((r) => r.data),

  logout: () => client.post('/auth/logout').then((r) => r.data),

  me: () => client.get<{ user: User }>('/auth/me').then((r) => r.data),
};

// ---------- CV ----------

export const cvApi = {
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return client
      .post<{
        cvId: string;
        filename: string;
        extractedSkills: string[];
        yearsExperience: number;
        embeddingDim: number;
        processedAt: string;
      }>('/cv/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },

  listMine: () => client.get<{ cvs: Cv[] }>('/cv/mine').then((r) => r.data.cvs),

  delete: (id: string) => client.delete(`/cv/${id}`).then((r) => r.data),
};

// ---------- Jobs ----------

export const jobApi = {
  listOpen: () => client.get<{ jobs: Job[] }>('/jobs').then((r) => r.data.jobs),

  listMine: () => client.get<{ jobs: Job[] }>('/jobs/mine').then((r) => r.data.jobs),

  create: (data: {
    title: string;
    company: string;
    description: string;
    requiredSkills: string[];
    minYears: number;
    location?: string;
    status?: JobStatus;
  }) => client.post<{ job: Job }>('/jobs', data).then((r) => r.data.job),

  delete: (id: string) => client.delete(`/jobs/${id}`).then((r) => r.data),
};

// ---------- Matching ----------

export const matchApi = {
  run: (args: { cvId?: string; jobId?: string; topK?: number }) =>
    client
      .post<{ runId: string; matches: MatchResult[] }>('/match/run', args)
      .then((r) => r.data),

  exportCsvUrl: (runId: string) => `/api/match/${runId}/export.csv`,
};

// ---------- Admin ----------

export const adminApi = {
  analytics: () =>
    client.get<AnalyticsData>('/admin/analytics').then((r) => r.data),

  listUsers: () =>
    client.get<{ users: User[]; nextCursor: string | null }>('/admin/users').then((r) => r.data),
};

// ---------- Agent ----------

export const agentApi = {
  run: (jobId: string, topK: number = 5) =>
    client.post<AgentRunResponse>('/agent/run', { jobId, topK }).then((r) => r.data),
};

// ---------- Error helper ----------

export const extractErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: { message?: string } } | undefined;
    return data?.error?.message ?? err.message ?? 'Request failed';
  }
  return err instanceof Error ? err.message : 'Unknown error';
};

export default client;
