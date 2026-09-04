import { index, integer, jsonb, pgTable, smallint, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';
import { users } from './auth.js';
import { jobStatusEnum } from './enums.js';

/** [SLEEP] Substitui o Redis. Contador por janela, incrementado em uma
 *  instrucao com ON CONFLICT. O cron diario limpa janelas vencidas. */
export const rateLimits = pgTable(
  'rate_limits',
  {
    /** "login:ip:1.2.3.4" | "write:user:<uuid>" | "gemini:user:<uuid>" */
    key: varchar('key', { length: 120 }).primaryKey(),
    count: integer('count').notNull(),
    windowEnd: timestamp('window_end', { withTimezone: true }).notNull()
  },
  (t) => [index('rate_limits_window_end_idx').on(t.windowEnd)]
);

/** [SLEEP] Existe para retomabilidade e progresso visivel, nao para
 *  distribuir trabalho. Nao ha worker: o job roda no proprio processo. */
export const jobQueue = pgTable(
  'job_queue',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 40 }).notNull(),
    payload: jsonb('payload').notNull(),
    status: jobStatusEnum('status').notNull().default('pending'),
    progress: integer('progress').notNull().default(0),
    total: integer('total').notNull().default(0),
    attempts: smallint('attempts').notNull().default(0),
    lastError: text('last_error'),
    runAt: timestamp('run_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index('job_queue_status_run_at_idx').on(t.status, t.runAt),
    index('job_queue_user_created_idx').on(t.userId, t.createdAt.desc())
  ]
);