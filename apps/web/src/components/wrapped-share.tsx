'use client';

import { Button } from '@/components/ui/button';
import { Download, Link as LinkIcon } from '@/lib/icons';
import { useState } from 'react';
import { toast } from 'sonner';

export function WrappedShare({ username, year }: { username: string; year: number }) {
  const [copied, setCopied] = useState(false);

  const url = typeof window === 'undefined' ? '' : window.location.href;
  const image = `/api/og/wrapped?username=${username}&year=${year}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar.');
    }
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6">
      <h2 className="text-h3">Compartilhar</h2>
      <p className="mt-1 text-small text-fg-muted">
        A imagem é gerada com esses números e serve como prévia no WhatsApp, no Twitter e no
        Discord.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild>
          {/** download força o salvamento em vez de abrir a imagem na aba. */}
          <a href={image} download={`watchlist-${username}-${year}.png`}>
            <Download className="size-4" aria-hidden />
            Baixar imagem
          </a>
        </Button>

        <Button variant="outline" onClick={() => void copy()}>
          <LinkIcon className="size-4" aria-hidden />
          {copied ? 'Copiado' : 'Copiar link'}
        </Button>
      </div>
    </section>
  );
}