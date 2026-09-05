import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema/index.js';

/** O tipo da conexao do projeto. Servico que recebe conexao usa este nome,
 *  nunca NodePgDatabase cru: sem o schema, os tipos nao batem com o app.db. */
export type Database = NodePgDatabase<typeof schema>;