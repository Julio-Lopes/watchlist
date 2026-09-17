import { z } from 'zod';

export const importRequestSchema = z.object({
  /** XML ja descomprimido pelo cliente. O MAL exporta .xml.gz, e o navegador
   *  descomprime com DecompressionStream, nativo: evita multipart na API e
   *  zlib no servidor. */
  xml: z.string().min(50).max(5_000_000),
  /** Entrada existente e pulada por padrao: se voce ja tem Naruto no
   *  episodio 55 e o XML diz 100, a escolha e sua. */
  overwrite: z.boolean().default(false)
});

export const importFailureSchema = z.object({
  malId: z.number(),
  title: z.string(),
  reason: z.string()
});

export const importResultSchema = z.object({
  total: z.number(),
  imported: z.number(),
  skipped: z.number(),
  failures: z.array(importFailureSchema)
});

export const importStatusSchema = z.object({
  jobId: z.uuid(),
  status: z.enum(['pending', 'running', 'done', 'failed', 'cancelled']),
  processed: z.number(),
  total: z.number(),
  result: importResultSchema.nullable(),
  error: z.string().nullable()
});

export type ImportResult = z.infer<typeof importResultSchema>;
export type ImportStatus = z.infer<typeof importStatusSchema>;