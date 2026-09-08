import type { Affinity } from '@watchlist/shared';

interface Props {
  title: string;
  items: Affinity[];
  emptyHint?: string;
}

export function AffinityList({ title, items, emptyHint }: Props) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6">
      <h2 className="font-serif text-h3">{title}</h2>

      {items.length === 0 ? (
        <p className="mt-2 text-small text-fg-muted">{emptyHint ?? 'Ainda sem dados suficientes.'}</p>
      ) : (
        <div className="mt-4 space-y-2.5">
          {items.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" loading="lazy" className="size-8 rounded-full object-cover" />
              ) : (
                <span className="size-8 shrink-0 rounded-full bg-surface-hover" />
              )}

              <span className="min-w-0 flex-1 truncate text-small">{item.name}</span>

              <span className="font-data text-caption text-fg-muted">{item.count} obras</span>
              <span className="font-data w-8 text-right text-small">
                {(item.averageRating / 10).toFixed(1).replace('.', ',')}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}