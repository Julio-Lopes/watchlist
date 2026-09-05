import { z } from 'zod';
import { jobStatusSchema } from './enums.js';

export const JOB_TYPES = ['airing.sync', 'sessions.cleanup', 'ratelimits.cleanup'] as const;

export const jobTypeSchema = z.enum(JOB_TYPES);
export type JobType = z.infer<typeof jobTypeSchema>;

export const jobViewSchema = z.object({
  id: z.uuid(),
  type: jobTypeSchema,
  status: jobStatusSchema,
  progress: z.int(),
  total: z.int(),
  attempts: z.int(),
  lastError: z.string().nullable(),
  createdAt: z.iso.datetime()
});

export type JobView = z.infer<typeof jobViewSchema>;