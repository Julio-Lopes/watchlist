import type { Database } from '@watchlist/db';
import type { JobType } from '@watchlist/shared';
import type { FastifyBaseLogger } from 'fastify';
import { airingSync } from './airing-sync.js';
import { rateLimitsCleanup, sessionsCleanup } from './cleanup.js';
import { seasonSync } from './season-sync.js';

export interface JobContext {
  db: Database;
  log: FastifyBaseLogger;
  payload: Record<string, unknown>;
  onProgress: (progress: number, total: number) => Promise<void>;
}

export type JobHandler = (context: JobContext) => Promise<void>;

export const handlers: Record<JobType, JobHandler> = {
  'airing.sync': airingSync,
  'season.sync': seasonSync,
  'sessions.cleanup': sessionsCleanup,
  'ratelimits.cleanup': rateLimitsCleanup
};

export const DAILY_JOBS: JobType[] = [
  'season.sync',
  'airing.sync',
  'sessions.cleanup',
  'ratelimits.cleanup'
];