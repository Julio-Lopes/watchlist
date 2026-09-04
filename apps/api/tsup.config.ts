import { defineConfig } from 'tsup';

/**
 * Empacota os workspaces internos no bundle. O Railway roda "node dist/index.js"
 * sem resolver links do pnpm, e um arquivo unico tambem sobe mais rapido,
 * o que aqui e cold start em cada visita.
 */
export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  noExternal: [/^@watchlist\//],
  splitting: false,
  sourcemap: true,
  clean: true
});

