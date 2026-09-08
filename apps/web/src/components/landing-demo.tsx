'use client';

import { Flame, Plus } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

/** Padrao fixo de atividade, com o ultimo dia reservado para acender na
 *  demonstracao. Nao e dado de ninguem: e ilustracao do formato. */
const HEAT = [0, 2, 0, 1, 3, 0, 0, 2, 4, 1, 0, 0, 3, 2, 0, 1, 0, 2, 3, 0, 0, 1, 4, 2, 0, 0, 3, 1, 0];
const LEVEL_CLASS = ['border border-border', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4'];

const CYCLE_MS = 6200;

export function LandingDemo() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    /** Sem animacao para quem pediu movimento reduzido: a demonstracao entra
     *  no estado final e a pagina continua fazendo sentido. */
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      setActive(true);
      setStep(4);
      return;
    }

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setActive(true);
      for (let index = 1; index <= 4; index += 1) {
        timeouts.push(setTimeout(() => setStep(index), 700 + index * 380));
      }
      timeouts.push(
        setTimeout(() => {
          setActive(false);
          setStep(0);
        }, 5000)
      );
    };

    run();
    const interval = setInterval(run, CYCLE_MS);

    return () => {
      clearInterval(interval);
      for (const timeout of timeouts) clearTimeout(timeout);
    };
  }, []);

  const shown = (index: number) => step >= index;

  const panel = (index: number, side: 'left' | 'right', children: React.ReactNode) => (
    <div
      className={cn(
        'transition-all duration-500',
        shown(index)
          ? 'translate-x-0 opacity-100'
          : side === 'left'
            ? 'translate-x-2.5 opacity-20'
            : '-translate-x-2.5 opacity-20'
      )}
    >
      {children}
    </div>
  );

  return (
    <div className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)]">
      <div className="space-y-3">
        {panel(
          1,
          'left',
          <>
            <p className="text-right text-caption tracking-wide text-fg-muted uppercase">Diário</p>
            <div className="mt-1.5 flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2">
              <span className="font-data text-h3">05</span>
              <div className="min-w-0 flex-1">
                <p className="text-small">Frieren</p>
                <p className="font-data text-caption text-fg-muted">ep 17 · 24 min</p>
              </div>
            </div>
          </>
        )}

        {panel(
          2,
          'left',
          <>
            <p className="text-right text-caption tracking-wide text-fg-muted uppercase">
              Sequência
            </p>
            <div className="mt-1.5 flex items-baseline justify-end gap-2 rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2">
              <Flame className="size-4 self-center text-accent" aria-hidden />
              <span className="font-data text-h3 text-accent">{shown(2) ? 24 : 23}</span>
              <span className="text-caption text-fg-muted">dias</span>
            </div>
          </>
        )}
      </div>

      <div className="mx-auto w-full max-w-[180px] overflow-hidden rounded-[var(--radius-card)] border border-accent/40 bg-surface shadow-[0_0_34px_rgba(124,58,237,0.14)]">
        <div className="relative aspect-2/3 bg-gradient-to-t from-[#241a3d] to-[#3b2a5e]">
          <span className="absolute left-2 top-2 rounded-[var(--radius-control)] bg-bg/80 px-2 py-0.5 text-caption">
            Anime
          </span>

          <span
            className={cn(
              'absolute bottom-3 right-2 flex items-center gap-1 rounded-[var(--radius-control)] bg-accent px-2.5 py-1.5 text-caption transition-all duration-200',
              active ? 'scale-100 opacity-100' : 'scale-100 opacity-0',
              step >= 1 && step <= 1 ? 'scale-90 shadow-[0_0_0_6px_rgba(124,58,237,0.2)]' : ''
            )}
          >
            <Plus className="size-3.5" aria-hidden />1 ep
          </span>

          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-border">
            <div
              className="h-full bg-success transition-[width] duration-500"
              style={{ width: shown(1) ? '61%' : '57%' }}
            />
          </div>
        </div>

        <div className="p-3">
          <p className="text-small">Frieren</p>
          <p className="font-data mt-1 text-caption text-fg-muted">
            {shown(1) ? '17' : '16'} / 28
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {panel(
          3,
          'right',
          <>
            <p className="text-caption tracking-wide text-fg-muted uppercase">Heatmap</p>
            <div className="mt-1.5 flex gap-[2px] rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2.5">
              {HEAT.map((level, index) => (
                <span
                  key={index}
                  className={cn('h-3 flex-1 rounded-[2px]', LEVEL_CLASS[level])}
                />
              ))}
              <span
                className={cn(
                  'h-3 flex-1 rounded-[2px] transition-colors duration-400',
                  shown(3) ? 'bg-heat-4' : 'border border-border'
                )}
              />
            </div>
          </>
        )}

        {panel(
          4,
          'right',
          <>
            <p className="text-caption tracking-wide text-fg-muted uppercase">Estatísticas</p>
            <div className="mt-1.5 flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2.5">
              <span className="w-16 shrink-0 text-small text-fg-muted">Fantasia</span>
              <div className="h-1.5 flex-1 rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-700"
                  style={{ width: shown(4) ? '47%' : '41%' }}
                />
              </div>
              <span className="font-data text-small">8,4</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}