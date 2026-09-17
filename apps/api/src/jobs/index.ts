import type { Database } from '@watchlist/db';
import type { JobType } from '@watchlist/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { Job } from '../services/job-queue.js';
import { airingSync } from './airing-sync.js';
import { rateLimitsCleanup, sessionsCleanup } from './cleanup.js';
import { importMal } from './import-mal.js';
import { seasonSync } from './season-sync.js';

export interface JobContext {
  db: Database;
  job: Job;
  log: FastifyBaseLogger;
  onProgress: (progress: number, total: number) => Promise<void>;
  isCancelled: () => Promise<boolean>;
}

export type JobHandler = (context: JobContext) => Promise<unknown>;

export const handlers: Record<JobType, JobHandler> = {
  'airing.sync': airingSync,
  'season.sync': seasonSync,
  'sessions.cleanup': sessionsCleanup,
  'ratelimits.cleanup': rateLimitsCleanup,
  'import.mal': importMal
};

export const DAILY_JOBS: JobType[] = [
  'season.sync',
  'airing.sync',
  'sessions.cleanup',
  'ratelimits.cleanup'
];