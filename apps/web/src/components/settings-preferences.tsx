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

const title = 'font-mincho text-[clamp(20px,2.4vw,28px)] font-normal tracking-[-0.01em] text-sumi';
const lead = 'mt-2.5 text-sm leading-[1.75] font-light text-sumi-soft';
const rowTitle = 'text-sm text-sumi';
const rowHint = 'mt-1.5 max-w-[38em] text-xs leading-[1.75] font-light text-sumi-faint';

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

  /** O ativo é o único preenchido, em sumi: é o estado, não uma ação. */
  const chip = (active: boolean) =>
    cn(
      'cursor-pointer border px-[15px] py-[7px] text-xs tracking-[0.06em] transition-colors duration-400 disabled:cursor-default',
      active
        ? 'border-sumi bg-sumi text-washi'
        : 'border-[#d9d4cd] bg-transparent text-sumi-soft hover:border-sumi'
    );

  return (
    <>
      <section
        id="privacidade"
        className="mt-[clamp(44px,7vh,76px)] scroll-mt-32 border-t border-hairline pt-[clamp(28px,4vh,40px)]"
      >
        <h2 className={title}>Privacidade</h2>
        <p className={lead}>Quem pode ver seu perfil e sua biblioteca.</p>

        <div className="mt-6 flex items-start justify-between gap-6">
          <div>
            <p className={rowTitle}>Perfil privado</p>
            {/** Preferencia sem consequencia declarada e preferencia que
             *   ninguem entende. */}
            <p className={rowHint}>
              Seu perfil deixa de abrir pelo link e você some do feed de quem te segue.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={current.isPrivate}
            aria-label="Perfil privado"
            disabled={busy}
            onClick={() => void update({ isPrivate: !current.isPrivate })}
            className={cn(
              'relative mt-0.5 h-5 w-9 shrink-0 cursor-pointer border-0 p-0 transition-colors duration-400 disabled:cursor-default',
              current.isPrivate ? 'bg-sumi' : 'bg-[#d9d4cd]'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-4 bg-washi transition-[left] duration-400',
                current.isPrivate ? 'left-[18px]' : 'left-0.5'
              )}
            />
          </button>
        </div>
      </section>

      <section
        id="preferencias"
        className="mt-[clamp(44px,7vh,76px)] scroll-mt-32 border-t border-hairline pt-[clamp(28px,4vh,40px)]"
      >
        <h2 className={title}>Preferências</h2>
        <p className={lead}>Como o produto se comporta para você.</p>

        <div className="mt-6 flex flex-col gap-[clamp(24px,3.4vh,32px)]">
          <div>
            <p className={rowTitle}>Escala de nota</p>
            <div className="mt-3 flex flex-wrap gap-2">
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
            <p className={rowTitle}>Modo sem spoiler</p>
            <p className={rowHint}>
              Moderado esconde o texto de reviews marcadas como spoiler. Rígido esconde também o
              total de episódios e a existência de continuação em obras que você não concluiu.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
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
            <p className={rowTitle}>Fuso horário</p>
            <p className={rowHint}>Define quando o dia vira para o cálculo da sequência.</p>
            <select
              value={current.timezone}
              disabled={busy}
              onChange={(event) => void update({ timezone: event.target.value })}
              className="mt-3 w-full max-w-xs cursor-pointer border-0 border-b border-[#d9d4cd] bg-transparent py-2.5 text-[15px] font-light text-sumi transition-colors duration-400 outline-none focus:border-torii"
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
