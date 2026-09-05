import { viewerSchema, type Viewer } from '@watchlist/shared';
import { cookies } from 'next/headers';
import { z } from 'zod';

/**
 * O rewrite do Next so vale para requisicao vinda do browser. Server Component
 * fala direto com o Railway, e por isso precisa repassar o cookie na mao.
 */
export async function serverFetch<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema
): Promise<z.infer<TSchema> | null> {
  const origin = process.env.API_ORIGIN;
  if (!origin) throw new Error('API_ORIGIN nao definida');

  try {
    const response = await fetch(`${origin}${path}`, {
      headers: { cookie: (await cookies()).toString() },
      cache: 'no-store'
    });

    if (!response.ok) return null;

    return schema.parse(await response.json());
  } catch {
    /** API dormindo, fora do ar ou lenta demais: a pagina decide o que fazer
     *  com o null, em vez de estourar um erro 500 para o usuario. */
    return null;
  }
}

const meSchema = z.object({ viewer: viewerSchema.nullable() });

export async function getViewer(): Promise<Viewer | null> {
  const result = await serverFetch('/auth/me', meSchema);
  return result?.viewer ?? null;
}