'use client';

import { ApiError, apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { settingsSchema, type Settings } from '@watchlist/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const SCALES = [
  { value: 'ten', label: '0 a 10' },
  { value: 'hundred', label: '0 a 100' },
  { value: 'stars', label: 'estrelas' }
] as const;

const SPOILER = [
  { value: 'off', label: 'desligado' },
  { value: 'soft', label: 'moderado' },
  { value: 'strict', label: 'rígido' }
] as const;

/** Lista curta de fusos brasileiros mais os principais. supportedValuesOf traz
 *  centenas, e um select com 400 linhas nao ajuda ninguem a achar o seu. */
const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Belem',
  'America/Fortaleza',
  'America/Cuiaba',
  'America/Rio_Branco',
  'America/Noronha',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Lisbon',
  'Europe/Madrid',
  'Asia/Tokyo',
  'UTC'
];

export function SettingsPreferences({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [current, setCurrent] = useState(settings);
  const [busy, setBusy] = useState(false);

  /** Salvamento automatico: sao escolhas binarias e reversiveis, e um botao
   *  de salvar aqui so acrescentaria um passo. No perfil, onde se digita
   *  texto, o botao existe. */
  async function update(patch: Record<string, unknown>) {
    const previous = current;
    setCurrent({ ...current, ...patch });
    setBusy(true);

    try {
      const updated = await apiFetch('/me/preferences', {
        method: 'PATCH',
        body: patch,
        schema: settingsSchema
      });
      setCurrent(updated);
      router.refresh();
    } catch (cause) {
      setCurrent(previous);
      toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }

  const chip = (active: boolean) =>
    cn(
      'rounded-[var(--radius-control)] border px-3 py-1 text-small transition-colors duration-150',
      active ? 'border-accent bg-accent text-fg' : 'border-border text-fg-muted hover:text-fg'
    );

  return (
    <>
      <section
        id="privacidade"
        className="scroll-mt-28 rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6"
      >
        <h2 className="text-h3">Privacidade</h2>
        <p className="mt-0.5 text-small text-fg-muted">Quem pode ver seu perfil e sua biblioteca.</p>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="max-w-md">
            <p className="text-small">Perfil privado</p>
            {/** Preferencia sem consequencia declarada e preferencia que
             *   ninguem entende. */}
            <p className="mt-0.5 text-caption text-fg-muted">
              Seu perfil deixa de abrir pelo link e você some do feed de quem te segue.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={current.isPrivate}
            disabled={busy}
            onClick={() => void update({ isPrivate: !current.isPrivate })}
            className={cn(
              'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150',
              current.isPrivate ? 'bg-accent' : 'bg-border'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-4 rounded-full bg-fg transition-[left] duration-150',
                current.isPrivate ? 'left-[18px]' : 'left-0.5'
              )}
            />
          </button>
        </div>
      </section>

      <section
        id="preferencias"
        className="scroll-mt-28 rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6"
      >
        <h2 className="text-h3">Preferências</h2>
        <p className="mt-0.5 text-small text-fg-muted">Como o produto se comporta para você.</p>

        <div className="mt-5 space-y-5">
          <div>
            <p className="text-small">Escala de nota</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SCALES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={busy}
                  onClick={() => void update({ ratingScale: option.value })}
                  className={chip(current.ratingScale === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-small">Modo sem spoiler</p>
            <p className="mt-0.5 text-caption text-fg-muted">
              Moderado esconde o texto de reviews marcadas como spoiler. Rígido esconde também o
              total de episódios e a existência de continuação em obras que você não concluiu.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SPOILER.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={busy}
                  onClick={() => void update({ spoilerMode: option.value })}
                  className={chip(current.spoilerMode === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-small">Fuso horário</p>
            <p className="mt-0.5 text-caption text-fg-muted">
              Define quando o dia vira para o cálculo da sequência.
            </p>
            <select
              value={current.timezone}
              disabled={busy}
              onChange={(event) => void update({ timezone: event.target.value })}
              className="mt-2 w-full max-w-xs rounded-[var(--radius-control)] border border-border bg-bg px-3 py-2 text-small"
            >
              {TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
              {!TIMEZONES.includes(current.timezone) && (
                <option value={current.timezone}>{current.timezone}</option>
              )}
            </select>
          </div>
        </div>
      </section>
    </>
  );
}