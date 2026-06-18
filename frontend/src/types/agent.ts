import type { MatchResult } from './index';

export interface AgentMatchItem extends MatchResult {
  outreach_email: string;
}

export interface AgentRunResponse {
  job_id: string;
  candidates: AgentMatchItem[];
  status: string;
  error?: string;
}
