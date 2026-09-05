import type { Database } from '@watchlist/db';
import type { JobType } from '@watchlist/shared';
import type { FastifyBaseLogger } from 'fastify';
import { airingSync } from './airing-sync.js';
import { rateLimitsCleanup, sessionsCleanup } from './cleanup.js';

export interface JobContext {
  db: Database;
  log: FastifyBaseLogger;
  payload: Record<string, unknown>;
  onProgress: (progress: number, total: number) => Promise<void>;
}

export type JobHandler = (context: JobContext) => Promise<void>;

export const handlers: Record<JobType, JobHandler> = {
  'airing.sync': airingSync,
  'sessions.cleanup': sessionsCleanup,
  'ratelimits.cleanup': rateLimitsCleanup
};

/** Executados todo dia pelo servico cron, nesta ordem. */
export const DAILY_JOBS: JobType[] = ['airing.sync', 'sessions.cleanup', 'ratelimits.cleanup'];