import type { z } from 'zod';

/**
 * Valida variaveis de ambiente e falha rapido, com mensagem legivel.
 * Container que sobe com env faltando e o pior modo de descobrir o problema.
*/
export function parseEnv<TSchema extends z.ZodType>(
  schema: TSchema,
  source: Record<string, string | undefined> = process.env
): z.infer<TSchema> {
  const result = schema.safeParse(source);

  if (!result.success) {
    const lines = result.error.issues.map((issue) => {
      const path = issue.path.join('.') || '(raiz)';
      return `  ${path}: ${issue.message}`;
    });
    throw new Error(`Variaveis de ambiente invalidas:\n${lines.join('\n')}`);
  }

  return result.data;
}
