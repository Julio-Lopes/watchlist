import type { CollectionSummary } from '@watchlist/shared';
import Link from 'next/link';

type Tone = 'dark' | 'washi';

/** A capa sai das proprias obras. Com menos de tres, cor solida em vez de
 *  esticar duas imagens. */
export function CollectionCover({
  covers,
  coverImage,
  tone = 'dark'
}: {
  covers: string[];
  coverImage?: string | null;
  tone?: Tone;
}) {
  if (coverImage) {
    return <img src={coverImage} alt="" className="size-full object-cover" />;
  }

  if (covers.length < 3) {
    return (
      <div
        className={
          tone === 'washi'
            ? 'size-full bg-[#eae6e0]'
            : 'size-full bg-gradient-to-t from-[#241a3d] to-[#3b2a5e]'
        }
      />
    );
  }

  return (
    <div className="flex size-full">
      {covers.map((cover, index) => (
        <img key={`${cover}-${index}`} src={cover} alt="" loading="lazy" className="h-full flex-1 object-cover" />
      ))}
    </div>
  );
}

interface Props {
  collection: CollectionSummary;
  username: string;
  /** `washi` é o tema novo (índice de coleções); `dark` segue no perfil, que
   *  ainda não foi migrado. */
  tone?: Tone;
}

export function CollectionCard({ collection, username, tone = 'dark' }: Props) {
  const count = `${collection.itemCount} ${collection.itemCount === 1 ? 'obra' : 'obras'}`;

  if (tone === 'washi') {
    return (
      <Link href={`/c/${username}/${collection.slug}`} className="block">
        <span className="block aspect-16/7 overflow-hidden bg-[#eae6e0]">
          <CollectionCover covers={collection.covers} coverImage={collection.coverImage} tone="washi" />
        </span>
        <span className="mt-3 block truncate font-mincho text-[19px] text-sumi">{collection.name}</span>
        <span className="mt-1.5 flex items-baseline gap-3 text-xs text-sumi-faint">
          <span className="font-mincho text-[13px] text-sumi-soft">{count}</span>
          {collection.isRanked && <span className="tracking-[0.14em] text-torii uppercase">ranqueada</span>}
          {!collection.isPublic && <span className="tracking-[0.14em] uppercase">privada</span>}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/c/${username}/${collection.slug}`}
      className="block overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface transition-colors duration-150 hover:border-fg-muted"
    >
      <div className="relative h-20">
        <CollectionCover covers={collection.covers} coverImage={collection.coverImage} />
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
        <p className="font-data mt-1 text-caption text-fg-muted">{count}</p>
      </div>
    </Link>
  );
}
