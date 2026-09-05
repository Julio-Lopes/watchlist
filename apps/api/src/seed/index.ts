import { createPool, type Database } from '@watchlist/db';
import * as schema from '@watchlist/db';
import { drizzle } from 'drizzle-orm/node-postgres';
import pino from 'pino';
import { env } from '../env.js';
import { seedActivity } from './activity.js';
import { seedBadges } from './badges.js';
import { seedCatalog } from './catalog.js';
import { createRandom } from './random.js';
import { seedUsers } from './users.js';

const log = pino({ level: 'info', transport: { target: 'pino-pretty' } });

/** Semente fixa: rodar de novo produz exatamente o mesmo conjunto. */
const random = createRandom(20_260_905);

const pool = createPool({ connectionString: env.DATABASE_URL, max: 4 });
const db = drizzle(pool, { schema }) as Database;

try {
  if (env.NODE_ENV === 'production') {
    throw new Error('seed nao roda em producao');
  }

  log.info('buscando catalogo nas fontes externas');
  const catalog = await seedCatalog(db, log as never);
  log.info({ titulos: catalog.length }, 'catalogo pronto');

  log.info('criando usuarios');
  const people = await seedUsers(db, random);

  log.info('gerando biblioteca e eventos');
  await seedActivity(db, random, people, catalog, log as never);

  log.info('concedendo badges');
  await seedBadges(db, people);

  log.info({ usuarios: people.length }, 'seed concluido');
} catch (error) {
  log.error({ err: error }, 'seed falhou');
  process.exitCode = 1;
} finally {
  await pool.end();
}