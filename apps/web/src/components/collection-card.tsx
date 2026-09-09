import type { CollectionSummary } from '@watchlist/shared';
import Link from 'next/link';

/** A capa sai das proprias obras. Com menos de tres, cor solida em vez de
 *  esticar duas imagens. */
export function CollectionCover({ covers }: { covers: string[] }) {
  if (covers.length < 3) {
    return <div className="size-full bg-gradient-to-t from-[#241a3d] to-[#3b2a5e]" />;
  }

  return (
    <div className="flex size-full">
      {covers.map((cover, index) => (
        <img
          key={`${cover}-${index}`}
          src={cover}
          alt=""
          loading="lazy"
          className="h-full flex-1 object-cover"
        />
      ))}
    </div>
  );
}

interface Props {
  collection: CollectionSummary;
  username: string;
}

export function CollectionCard({ collection, username }: Props) {
  return (
    <Link
      href={`/c/${username}/${collection.slug}`}
      className="block overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface transition-colors duration-150 hover:border-fg-muted"
    >
      <div className="relative h-20">
        <CollectionCover covers={collection.covers} />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />

        <div className="absolute left-3 top-2 flex gap-1.5">
          {collection.isRanked && (
            <span className="font-data rounded-[var(--radius-control)] border border-accent/60 bg-bg/70 px-2 py-0.5 text-caption text-heat-4">
              ranqueada
            </span>
          )}
          {!collection.isPublic && (
            <span className="rounded-[var(--radius-control)] border border-border bg-bg/70 px-2 py-0.5 text-caption text-fg-muted">
              privada
            </span>
          )}
        </div>
      </div>

      <div className="p-3">
        <p className="truncate font-serif text-h3">{collection.name}</p>
        <p className="font-data mt-1 text-caption text-fg-muted">
          {collection.itemCount} {collection.itemCount === 1 ? 'obra' : 'obras'}
        </p>
      </div>
    </Link>
  );
}