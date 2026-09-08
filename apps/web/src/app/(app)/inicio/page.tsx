import { FeedEmpty } from '@/components/feed-empty';
import { FeedList } from '@/components/feed-list';
import { serverFetch } from '@/lib/api-server';
import {
  activityStatsSchema,
  entrySchema,
  feedResponseSchema,
  suggestedUserSchema
} from '@watchlist/shared';
import Link from 'next/link';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const continueSchema = z.object({ items: z.array(entrySchema) });

export default async function InicioPage() {
  const [feed, stats, resume, suggestions] = await Promise.all([
    serverFetch('/feed', feedResponseSchema),
    serverFetch('/stats/activity', activityStatsSchema),
    serverFetch('/entries/continue?limit=4', continueSchema),
    serverFetch('/feed/suggestions', z.array(suggestedUserSchema))
  ]);

  const empty = !feed || feed.items.length === 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="space-y-4">
        <h1 className="font-serif text-h2">Início</h1>

        {empty ? (
          <FeedEmpty suggestions={suggestions ?? []} />
        ) : (
          <FeedList initialItems={feed.items} initialCursor={feed.nextCursor} />
        )}
      </div>

      {/** A coluna e sua: com poucos seguidos, o feed fica curto e a tela
       *   precisa ter algo seu para mostrar. */}
      <aside className="space-y-3">
        {stats && stats.currentStreak > 0 && (
          <Link
            href="/estatisticas"
            className="block rounded-[var(--radius-card)] border border-border bg-surface p-4 transition-colors duration-150 hover:border-fg-muted"
          >
            <p className="text-caption tracking-wide text-fg-muted uppercase">Sua sequência</p>
            <p className="font-data mt-1 text-h1 text-accent">{stats.currentStreak}</p>
            <p className="text-caption text-fg-muted">
              {stats.currentStreak === 1 ? 'dia seguido' : 'dias seguidos'}
            </p>
          </Link>
        )}

        {resume && resume.items.length > 0 && (
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <p className="text-caption tracking-wide text-fg-muted uppercase">Continuar</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {resume.items.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/media/${entry.media.source}/${entry.media.mediaType}/${entry.media.externalId}`}
                  title={entry.media.title}
                  className="aspect-2/3 overflow-hidden rounded-[var(--radius-control)] bg-surface-hover"
                >
                  {entry.media.coverImage && (
                    <img
                      src={entry.media.coverImage}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}