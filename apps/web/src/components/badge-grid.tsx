import { Lock } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { BadgeStatus } from '@watchlist/shared';

const TIER_CLASS: Record<string, string> = {
  bronze: 'bg-heat-1 text-fg',
  silver: 'bg-heat-2 text-fg',
  gold: 'bg-heat-3 text-fg',
  platinum: 'bg-heat-4 text-fg'
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
    <div className="space-y-8">
      {tiers.map((tier) => (
        <section key={tier}>
          <h2 className="text-caption tracking-wide text-fg-muted uppercase">
            {TIER_LABEL[tier]}
          </h2>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items
              .filter((item) => item.tier === tier)
              .map((item) => {
                const earned = item.earnedAt !== null;
                const percent =
                  item.current !== null && item.target
                    ? Math.min(100, Math.round((item.current / item.target) * 100))
                    : 0;

                return (
                  <div
                    key={item.slug}
                    className={cn(
                      'rounded-[var(--radius-card)] border p-4 transition-colors duration-150',
                      earned ? 'border-accent/40 bg-surface' : 'border-border bg-surface/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] font-serif text-body',
                          earned ? TIER_CLASS[item.tier] : 'bg-surface-hover text-fg-muted'
                        )}
                      >
                        {item.current === null ? (
                          <Lock className="size-4" aria-hidden />
                        ) : (
                          item.name.slice(0, 1)
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className={cn('text-body', earned ? '' : 'text-fg-muted')}>
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="mt-0.5 text-caption text-fg-muted">{item.description}</p>
                        )}
                      </div>
                    </div>

                    {/** Progresso so nas nao ganhas: depois de conquistada, a
                     *   barra cheia nao acrescenta nada. Secreta nao mostra
                     *   nada, senao o criterio vazaria. */}
                    {!earned && item.current !== null && item.target !== null && (
                      <div className="mt-3">
                        <div className="h-1 rounded-full bg-border">
                          <div
                            className="h-full rounded-full bg-accent transition-[width] duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="font-data mt-1.5 text-caption text-fg-muted">
                          {item.current} de {item.target}
                        </p>
                      </div>
                    )}

                    {earned && item.earnedAt && (
                      <p className="font-data mt-3 text-caption text-accent">
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