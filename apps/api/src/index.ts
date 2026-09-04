import { buildApp } from './app.js';
import { env } from './env.js';

const app = await buildApp();

/**
 * Bind em 0.0.0.0 e obrigatorio: escutar em localhost faz o healthcheck do
 * Railway falhar e o deploy entra em loop de restart.
 */
await app.listen({ host: '0.0.0.0', port: env.PORT });

/**
 * O Railway manda SIGTERM e mata em seguida. Sem tratar, deploy no meio de
 * uma importacao corrompe o job_queue.
 */
const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, 'shutdown failed');
    process.exit(1);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));