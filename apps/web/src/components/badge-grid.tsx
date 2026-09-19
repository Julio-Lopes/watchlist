import { Lock } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { BadgeStatus } from '@watchlist/shared';

/** O nível é densidade de tinta, a mesma leitura dos selos do perfil: contorno
 *  vazado, papel um tom, sumi cheio, torii. Badge não conquistada perde a tinta
 *  e fica tracejada. */
const TIER_CLASS: Record<string, string> = {
  bronze: 'border-[#d9d4cd] bg-transparent text-sumi-soft',
  silver: 'border-[#b4aea6] bg-[#ece8e2] text-sumi',
  gold: 'border-sumi bg-sumi text-washi',
  platinum: 'border-torii bg-torii text-washi'
};

const TIER_LABEL: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  platinum: 'Platina'
};

export function BadgeGrid({ items }: { items: BadgeStatus[] }) {
  /** Agrupa por tier na ordem do enum, nao alfabetica: bronze antes de ouro
   *  conta uma progressao. */
  const tiers = ['bronze', 'silver', 'gold', 'platinum'].filter((tier) =>
    items.some((item) => item.tier === tier)
  );

  return (
    <div>
      {tiers.map((tier) => (
        <section key={tier} className="mt-[clamp(34px,5vh,52px)] first:mt-0">
          <h2 className="border-b border-hairline pb-3 text-[11px] font-normal tracking-[0.2em] text-sumi-faint uppercase">
            {TIER_LABEL[tier]}
          </h2>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] border-l border-hairline">
            {items
              .filter((item) => item.tier === tier)
              .map((item) => {
                const earned = item.earnedAt !== null;
                const percent =
                  item.current !== null && item.target
                    ? Math.min(100, Math.round((item.current / item.target) * 100))
                    : 0;

                return (
                  <div key={item.slug} className="border-r border-b border-hairline px-[clamp(16px,2vw,22px)] py-[clamp(18px,2.4vw,24px)]">
                    <div className="flex items-start gap-3.5">
                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center border font-mincho text-base',
                          earned
                            ? TIER_CLASS[item.tier]
                            : 'border-dashed border-[#d9d4cd] bg-transparent text-sumi-faint'
                        )}
                      >
                        {item.current === null && !earned ? (
                          <Lock className="size-4" strokeWidth={1.2} aria-hidden />
                        ) : (
                          item.name.slice(0, 1)
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className={cn('text-[14.5px]', earned ? 'text-sumi' : 'text-sumi-soft')}>
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="mt-1 text-xs leading-[1.7] font-light text-sumi-faint">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/** Progresso so nas nao ganhas: depois de conquistada, a
                     *   barra cheia nao acrescenta nada. Secreta nao mostra
                     *   nada, senao o criterio vazaria. */}
                    {!earned && item.current !== null && item.target !== null && (
                      <div className="mt-4">
                        <div className="h-px bg-[#d9d4cd]">
                          <div
                            className="h-px bg-torii transition-[width] duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="mt-2 font-mincho text-[13px] text-sumi-soft">
                          {item.current}{' '}
                          <span className="text-sumi-faint">de {item.target}</span>
                        </p>
                      </div>
                    )}

                    {earned && item.earnedAt && (
                      <p className="mt-4 text-[11.5px] tracking-[0.06em] text-torii">
                        conquistada em{' '}
                        {new Date(item.earnedAt).toLocaleDateString('pt-BR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
