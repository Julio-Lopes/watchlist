import pg from 'pg';

export interface PoolOptions {
  connectionString: string;
  // Nunca aumente. Conexao viva envia keepalive e o Railway nunca dorme. 
  max?: number;
}

/**
 * [SLEEP] min: 0 e idleTimeoutMillis: 10000 nao sao ajuste de performance.
 * Pool com conexao ociosa aberta mantem o container acordado 24h por dia
 * e faz o Neon nunca suspender. Ver secao 3 da especificacao.
*/
export function createPool({ connectionString, max = 10 }: PoolOptions): pg.Pool {
  return new pg.Pool({
    connectionString,
    max,
    min: 0,
    idleTimeoutMillis: 10_000,
    allowExitOnIdle: true,
    connectionTimeoutMillis: 10_000,
    keepAlive: false
  });
}