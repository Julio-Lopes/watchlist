'use client';

import { apiFetch } from '@/lib/api-client';
import type { BadgeStatus } from '@watchlist/shared';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Aviso das badges novas ao abrir qualquer tela do app. Sem sistema de
 * notificacao: o servidor marca seen_at e o toast some para sempre.
 */
export function BadgeToast({ unseen }: { unseen: BadgeStatus[] }) {
  const fired = useRef(false);

  useEffect(() => {
    /** O ref evita disparar duas vezes no modo de desenvolvimento, onde o
     *  React monta o componente em dobro. */
    if (fired.current || unseen.length === 0) return;
    fired.current = true;

    for (const badge of unseen) {
      toast.success(`Badge conquistada: ${badge.name}`, {
        description: badge.description ?? undefined,
        duration: 6000
      });
    }

    void apiFetch('/me/badges/seen', { method: 'POST' }).catch(() => {
      /** Falhar aqui so faz o aviso repetir na proxima tela. Nao vale
       *  incomodar a pessoa com erro por causa disso. */
    });
  }, [unseen]);

  return null;
}