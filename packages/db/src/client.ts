import pg from 'pg';

export interface PoolOptions {
  connectionString: string;
  /** Nunca aumente o minimo. Conexao ociosa aberta impede o container de dormir. */
  max?: number;
}

/**
 * [SLEEP] min: 0 e idleTimeoutMillis: 10000 nao sao ajuste de performance.
 * Pool com conexao viva envia keepalive, o Railway nunca dorme e o Neon nunca
 * suspende. Ver secao 3 da especificacao.
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