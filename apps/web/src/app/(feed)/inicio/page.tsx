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
    <div className="flex flex-wrap items-start gap-[clamp(36px,5vw,72px)]">
      <div className="min-w-0 flex-[1_1_min(100%,520px)]">
        <h1 className="font-mincho text-[clamp(26px,3.2vw,38px)] font-normal tracking-[-0.015em] text-sumi">
          Início
        </h1>

        {empty ? (
          <FeedEmpty suggestions={suggestions ?? []} />
        ) : (
          <FeedList initialItems={feed.items} initialCursor={feed.nextCursor} />
        )}
      </div>

      {/** A coluna e sua: com poucos seguidos, o feed fica curto e a tela
       *   precisa ter algo seu para mostrar. */}
      <aside className="sticky top-[126px] min-w-0 flex-[1_1_min(100%,220px)] max-w-[280px]">
        {stats && stats.currentStreak > 0 && (
          <Link href="/estatisticas" className="block pb-1">
            <p className="border-b border-hairline pb-4 text-[11px] tracking-[0.2em] text-sumi-faint uppercase">
              Sua sequência
            </p>
            <span className="flex items-baseline gap-3 pt-[18px]">
              <span className="font-mincho text-[clamp(40px,5vw,56px)] leading-none text-torii">
                {stats.currentStreak}
              </span>
              <span className="text-[13px] font-light tracking-[0.04em] text-sumi-soft">
                {stats.currentStreak === 1 ? 'dia seguido' : 'dias seguidos'}
              </span>
            </span>
          </Link>
        )}

        {resume && resume.items.length > 0 && (
          <section className="mt-[clamp(38px,6vh,54px)]">
            <p className="border-b border-hairline pb-4 text-[11px] tracking-[0.2em] text-sumi-faint uppercase">
              Continuar
            </p>
            <div className="mt-[18px] grid grid-cols-4 gap-2">
              {resume.items.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/media/${entry.media.source}/${entry.media.mediaType}/${entry.media.externalId}`}
                  title={entry.media.title}
                  className="block aspect-2/3 overflow-hidden bg-[#eae6e0]"
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
            <Link
              href="/biblioteca"
              className="mt-4 inline-block border-b border-[#d9d4cd] pb-0.5 text-xs tracking-[0.06em] text-sumi-soft transition-colors duration-400 hover:text-sumi"
            >
              Abrir a biblioteca
            </Link>
          </section>
        )}
      </aside>
    </div>
  );
}
