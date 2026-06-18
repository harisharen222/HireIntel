import axios, { AxiosInstance, AxiosError } from 'axios';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { serviceUnavailable, unprocessable } from '../utils/errors';

export interface ParseResult {
  text: string;
  skills: string[];
  yearsExperience: number;
}

export interface EmbedResult {
  embedding: number[]; // length 384
  dim: number;
  model: string;
}

export interface MatchResultFromAi {
  jobId: string;
  jobTitle: string;
  company: string;
  semanticSimilarity: number;
  skillOverlap: number;
  experienceFit: number;
  finalScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  verdict: 'STRONG_FIT' | 'MEDIUM_FIT' | 'WEAK_FIT';
}

/**
 * Lightweight circuit breaker. Three consecutive failures → fast-fail for 30s.
 * In production you'd reach for opossum or a mesh-level breaker; this is the
 * minimum that demonstrates the pattern without adding a dep for one use.
 */
class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;
  private readonly threshold = 3;
  private readonly cooldownMs = 30_000;

  canAttempt(): boolean {
    return Date.now() >= this.openUntil;
  }

  recordSuccess(): void {
    this.failures = 0;
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.openUntil = Date.now() + this.cooldownMs;
      this.failures = 0;
      logger.warn({ reopenAt: new Date(this.openUntil) }, 'AI service circuit opened');
    }
  }
}

const breaker = new CircuitBreaker();

const http: AxiosInstance = axios.create({
  baseURL: env.AI_SERVICE_URL,
  timeout: 10_000,
  headers: {
    'X-Internal-API-Key': env.INTERNAL_API_KEY,
    'Content-Type': 'application/json',
  },
});

const wrap = async <T>(fn: () => Promise<T>, label: string): Promise<T> => {
  if (!breaker.canAttempt()) {
    throw serviceUnavailable('AI service temporarily unavailable');
  }
  try {
    const result = await fn();
    breaker.recordSuccess();
    return result;
  } catch (err) {
    const ax = err as AxiosError<{ detail?: string }>;
    // 4xx responses from the AI service are client errors, not service failures —
    // don't trip the breaker, re-raise as unprocessable.
    if (ax.response && ax.response.status >= 400 && ax.response.status < 500) {
      throw unprocessable(ax.response.data?.detail ?? `AI service rejected ${label}`);
    }
    breaker.recordFailure();
    logger.error({ err, label }, 'AI service call failed');
    throw serviceUnavailable(`AI service error during ${label}`);
  }
};

export const aiClient = {
  parse: (fileBuffer: Buffer, filename: string): Promise<ParseResult> =>
    wrap(() => {
      const formData = new FormData();
      formData.append('file', new Blob([fileBuffer]), filename);
      return http
        .post<ParseResult>('/parse', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data);
    }, 'parse'),

  embed: (text: string): Promise<EmbedResult> =>
    wrap(() => http.post<EmbedResult>('/embed', { text }).then((r) => r.data), 'embed'),

  match: (args: {
    cvId?: string;
    jobId?: string;
    topK: number;
  }): Promise<MatchResultFromAi[]> =>
    wrap(
      () =>
        http
          .post<{ matches: MatchResultFromAi[] }>('/match', args)
          .then((r) => r.data.matches),
      'match'
    ),

  upsertVector: (args: {
    doc_id: string;
    vector: number[];
    metadata: Record<string, any>;
    collection: string;
  }): Promise<{ ok: boolean }> =>
    wrap(
      () => http.post<{ ok: boolean }>('/vectors/upsert', args).then((r) => r.data),
      'upsertVector'
    ),

  deleteVector: (collection: string, doc_id: string): Promise<{ ok: boolean }> =>
    wrap(
      () => http.delete<{ ok: boolean }>(`/vectors/${collection}/${doc_id}`).then((r) => r.data),
      'deleteVector'
    ),
};
