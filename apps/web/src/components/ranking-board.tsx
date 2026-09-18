import type { RankingBoard, RankingItem } from '@watchlist/shared';
import Link from 'next/link';

const KIND_LABEL: Record<string, string> = {
  rating: 'Mais bem avaliadas',
  watched: 'Mais assistidas',
  dropped: 'Mais largadas',
  trending: 'Em alta'
};

/** A unidade dita embaixo de cada bloco. Um numero sem unidade obriga quem
 *  le a adivinhar o que ele significa. */
const KIND_FOOTER: Record<string, string> = {
  rating: 'obras com notas suficientes',
  watched: 'pessoas que adicionaram',
  dropped: 'quem começou e desistiu',
  trending: 'adicionadas nos últimos 30 dias'
};

const KIND_ACCENT: Record<string, string> = {
  rating: 'text-accent',
  watched: 'text-accent',
  dropped: 'text-danger',
  trending: 'text-success'
};

function formatValue(kind: string, value: number): string {
  if (kind === 'rating') return value.toFixed(1).replace('.', ',');
  if (kind === 'dropped') return `${value}%`;
  if (kind === 'trending') return `+${value}`;
  return String(value);
}

function Row({
  item,
  kind,
  compact
}: {
  item: RankingItem;
  kind: string;
  compact: boolean;
}) {
  const href = `/media/${item.source}/${item.mediaType}/${item.externalId}`;

  if (compact) {
    return (
      <Link href={href} className="flex items-center gap-2.5">
        <span
          className={`font-data w-3 shrink-0 text-caption ${
            item.position === 1 ? KIND_ACCENT[kind] : 'text-border'
          }`}
        >
          {item.position}
        </span>

        <div className="h-[30px] w-5 shrink-0 overflow-hidden rounded-[2px] bg-surface-hover">
          {item.coverImage && (
            <img src={item.coverImage} alt="" loading="lazy" className="size-full object-cover" />
          )}
        </div>

        <span className="min-w-0 flex-1 truncate text-caption">{item.title}</span>
        <span className="font-data shrink-0 text-caption text-fg-muted">
          {formatValue(kind, item.value)}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-[var(--radius-card)] p-2.5 transition-colors duration-150 hover:bg-surface md:gap-5"
    >
      <span
        className={`w-8 shrink-0 text-center font-serif text-[27px] leading-none ${
          item.position === 1 ? KIND_ACCENT[kind] : 'text-border'
        }`}
      >
        {item.position}
      </span>

      <div className="h-[51px] w-[34px] shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-surface-hover">
        {item.coverImage && (
          <img src={item.coverImage} alt="" loading="lazy" className="size-full object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-small">{item.title}</p>
        <p className="font-data mt-0.5 text-caption text-fg-muted">
          {item.mediaType === 'anime' ? 'anime' : item.mediaType === 'movie' ? 'filme' : 'série'}
          {item.year ? ` · ${item.year}` : ''}
          {item.totalEpisodes ? ` · ${item.totalEpisodes} eps` : ''}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-data text-body">{formatValue(kind, item.value)}</p>
        <p className="font-data text-caption text-border">
          {item.sample} {item.sample === 1 ? 'pessoa' : 'pessoas'}
        </p>
      </div>
    </Link>
  );
}

export function RankingCard({ board, type }: { board: RankingBoard; type?: string }) {
  const query = new URLSearchParams({ kind: board.kind });
  if (type) query.set('type', type);

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <h2 className="text-caption tracking-wide text-fg-muted uppercase">
        {KIND_LABEL[board.kind]}
      </h2>

      {board.items.length === 0 ? (
        <p className="mt-3 text-caption text-fg-muted">Ainda não há dados suficientes.</p>
      ) : (
        <>
          <div className="mt-3 space-y-2">
            {board.items.map((item) => (
              <Row key={`${item.source}-${item.externalId}`} item={item} kind={board.kind} compact />
            ))}
          </div>

          <div className="mt-3 flex items-baseline justify-between border-t border-border pt-2.5">
            <span className="font-data text-caption text-border">
              {board.kind === 'rating'
                ? `${board.eligible} ${KIND_FOOTER[board.kind]}`
                : KIND_FOOTER[board.kind]}
            </span>
            <Link href={`/ranking?${query.toString()}`} className="text-caption text-fg-muted hover:text-fg">
              ver tudo
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

export function RankingList({ board }: { board: RankingBoard }) {
  if (board.items.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
        <p className="text-body">Ainda não há dados suficientes</p>
        <p className="mt-1 text-small text-fg-muted">
          Este ranking aparece quando mais pessoas avaliarem obras por aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {board.items.map((item) => (
        <Row key={`${item.source}-${item.externalId}`} item={item} kind={board.kind} compact={false} />
      ))}
    </div>
  );
}