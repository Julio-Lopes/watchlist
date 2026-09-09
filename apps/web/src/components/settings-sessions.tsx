'use client';

import { ApiError, apiFetch } from '@/lib/api-client';
import type { SessionInfo } from '@watchlist/shared';
import { useState } from 'react';
import { toast } from 'sonner';

/** Parsing rasteiro do user agent. Nao vale uma biblioteca: o objetivo e a
 *  pessoa reconhecer o proprio dispositivo, nao telemetria precisa. */
function describe(userAgent: string | null): string {
  if (!userAgent) return 'Dispositivo desconhecido';

  const browser = /Edg/.test(userAgent)
    ? 'Edge'
    : /Chrome/.test(userAgent)
      ? 'Chrome'
      : /Safari/.test(userAgent)
        ? 'Safari'
        : /Firefox/.test(userAgent)
          ? 'Firefox'
          : 'Navegador';

  const system = /iPhone|iPad/.test(userAgent)
    ? 'iOS'
    : /Android/.test(userAgent)
      ? 'Android'
      : /Mac/.test(userAgent)
        ? 'macOS'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : 'sistema desconhecido';

  return `${browser} no ${system}`;
}

const relative = (iso: string): string => {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 5) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  if (minutes < 1440) return `há ${Math.round(minutes / 60)}h`;
  const days = Math.round(minutes / 1440);
  return days === 1 ? 'ontem' : `há ${days} dias`;
};

export function SettingsSessions({ sessions }: { sessions: SessionInfo[] }) {
  const [items, setItems] = useState(sessions);
  const [busy, setBusy] = useState<string | null>(null);

  async function revoke(id: string) {
    setBusy(id);

    try {
      await apiFetch(`/me/sessions/${id}`, { method: 'DELETE' });
      setItems((current) => current.filter((session) => session.id !== id));
      toast.success('Sessão encerrada.');
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível encerrar.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      id="sessoes"
      className="scroll-mt-28 rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6"
    >
      <h2 className="text-h3">Sessões ativas</h2>
      <p className="mt-0.5 text-small text-fg-muted">Onde sua conta está aberta agora.</p>

      <div className="mt-4 space-y-3">
        {items.map((session) => (
          <div key={session.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-small">
                {describe(session.userAgent)}
                {session.isCurrent && (
                  <span className="ml-2 text-caption text-success">este dispositivo</span>
                )}
              </p>
              <p className="font-data mt-0.5 text-caption text-fg-muted">
                {session.ip ?? 'IP desconhecido'} · {relative(session.lastSeenAt)}
              </p>
            </div>

            {!session.isCurrent && (
              <button
                type="button"
                onClick={() => void revoke(session.id)}
                disabled={busy === session.id}
                className="shrink-0 rounded-[var(--radius-control)] border border-border px-3 py-1 text-caption text-fg-muted transition-colors duration-150 hover:text-fg disabled:opacity-50"
              >
                {busy === session.id ? 'Encerrando...' : 'Encerrar'}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}