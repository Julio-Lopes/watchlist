'use client';

import { apiFetch } from '@/lib/api-client';
import { EyeOff } from '@/lib/icons';
import { revealedReviewSchema } from '@watchlist/shared';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
  reviewId: string;
  content: string;
  hidden: boolean;
  /** Trecho ou texto inteiro: o feed corta em 240, a pagina da obra nao. */
  className?: string;
}

/**
 * O texto oculto nao vem na listagem: o servidor manda string vazia. Revelar
 * e uma requisicao explicita, feita quando a pessoa clica sabendo que ha
 * spoiler. Antes o texto chegava junto e o cliente so escondia, o que nao
 * protegia de quem abrisse o inspetor.
 */
export function SpoilerText({ reviewId, content, hidden, className }: Props) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reveal() {
    setBusy(true);

    try {
      const result = await apiFetch(`/reviews/${reviewId}/reveal`, {
        schema: revealedReviewSchema
      });
      setRevealed(result.content);
    } catch {
      toast.error('Não foi possível carregar o texto.');
    } finally {
      setBusy(false);
    }
  }

  if (hidden && revealed === null) {
    return (
      <button
        type="button"
        onClick={() => void reveal()}
        disabled={busy}
        className="mt-3 flex w-full items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border px-3 py-2.5 text-small text-fg-muted transition-colors duration-150 hover:text-fg"
      >
        <EyeOff className="size-4" aria-hidden />
        {busy ? 'Carregando...' : 'Contém spoiler. Toque para ler.'}
      </button>
    );
  }

  return (
    <p className={className ?? 'mt-3 whitespace-pre-line text-small leading-relaxed text-fg-muted'}>
      {revealed ?? content}
    </p>
  );
}