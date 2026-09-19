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
      className="mt-[clamp(44px,7vh,76px)] scroll-mt-32 border-t border-hairline pt-[clamp(28px,4vh,40px)]"
    >
      <h2 className="font-mincho text-[clamp(20px,2.4vw,28px)] font-normal tracking-[-0.01em] text-sumi">
        Sessões ativas
      </h2>
      <p className="mt-2.5 text-sm leading-[1.75] font-light text-sumi-soft">
        Onde sua conta está aberta agora.
      </p>

      <div className="mt-6 border-t border-hairline">
        {items.map((session) => (
          <div
            key={session.id}
            className="flex items-center gap-4 border-b border-hairline px-1 py-3.5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-sumi">
                {describe(session.userAgent)}
                {session.isCurrent && (
                  <span className="ml-3 text-[11px] tracking-[0.14em] text-torii uppercase">
                    este dispositivo
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs tracking-[0.04em] text-sumi-faint">
                {session.ip ?? 'IP desconhecido'} · {relative(session.lastSeenAt)}
              </p>
            </div>

            {!session.isCurrent && (
              <button
                type="button"
                onClick={() => void revoke(session.id)}
                disabled={busy === session.id}
                className="shrink-0 cursor-pointer border border-[#d9d4cd] bg-transparent px-4 py-2 text-[11.5px] tracking-[0.12em] text-sumi uppercase transition-colors duration-400 hover:border-sumi hover:bg-sumi hover:text-washi disabled:cursor-default disabled:opacity-50"
              >
                {busy === session.id ? 'Encerrando…' : 'Encerrar'}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
