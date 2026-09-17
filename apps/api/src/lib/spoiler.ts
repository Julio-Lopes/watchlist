export type SpoilerMode = 'off' | 'soft' | 'strict';

/** Visitante anonimo recebe a protecao moderada sem pedir: e o padrao do
 *  perfil, e quem nunca abriu as configuracoes esta protegido. */
export const DEFAULT_MODE: SpoilerMode = 'soft';

/**
 * Obra concluida nunca e filtrada: se voce terminou, nao ha spoiler possivel.
 * O status vem da entrada do viewer; sem entrada, o rigido filtra, porque
 * voce pode estar considerando assistir.
 */
export function shouldHideProgress(
  mode: SpoilerMode,
  entryStatus: string | null
): boolean {
  if (mode !== 'strict') return false;
  return entryStatus !== 'completed';
}

export function shouldHideReview(mode: SpoilerMode, containsSpoilers: boolean): boolean {
  return mode !== 'off' && containsSpoilers;
}