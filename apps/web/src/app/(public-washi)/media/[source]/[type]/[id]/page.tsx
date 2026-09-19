import { AddToCollection } from '@/components/add-to-collection';
import { EntryDialog } from '@/components/entry-dialog';
import { FeedShell } from '@/components/feed-shell';
import { PublicHeader } from '@/components/public-header';
import { Recommendations } from '@/components/recommendations';
import { ReviewList } from '@/components/review-list';
import { getViewer, serverFetch } from '@/lib/api-server';
import {
  activityStatsSchema,
  entryListSchema,
  mediaDetailSchema,
  reviewListSchema
} from '@watchlist/shared';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = { anime: 'Anime', show: 'Série', movie: 'Filme' };

const ROLE_LABEL: Record<string, string> = {
  studio: 'Estúdio',
  director: 'Direção',
  writer: 'Roteiro',
  composer: 'Música',
  character_design: 'Personagens',
  original_creator: 'Obra original',
  producer: 'Produção',
  cast: 'Elenco',
  voice: 'Vozes'
};

export default async function MediaPage({
  params
}: {
  params: Promise<{ source: string; type: string; id: string }>;
}) {
  const { source, type, id } = await params;

  const media = await serverFetch(`/media/${source}/${type}/${id}`, mediaDetailSchema);
  if (!media) notFound();

  /** Viewer, biblioteca e reviews em paralelo. Anonimo recebe null nos dois
   *  primeiros e a pagina segue: esta e a porta de entrada organica e nao
   *  pode exigir sessao. */
  const [viewer, library, reviews] = await Promise.all([
    getViewer(),
    serverFetch(`/entries?q=${encodeURIComponent(media.title)}`, entryListSchema),
    serverFetch(`/media/${source}/${type}/${id}/reviews`, reviewListSchema)
  ]);

  const entry = library?.items.find((item) => item.media.id === media.id) ?? null;

  /** Agrupados por papel: o papel é o rótulo, não o registro. Sem isso,
   *  "Estúdio" aparece uma vez por nome. */
  const creditRows: { label: string; names: string[] }[] = [];
  for (const credit of media.credits) {
    if (credit.role === 'cast') continue;
    const label = ROLE_LABEL[credit.role] ?? credit.role;
    const row = creditRows.find((item) => item.label === label);
    if (row) row.names.push(credit.name);
    else creditRows.push({ label, names: [credit.name] });
  }

  const cast = media.credits.filter((credit) => credit.role === 'cast');
  if (cast.length > 0) {
    creditRows.push({ label: ROLE_LABEL.cast!, names: cast.map((person) => person.name) });
  }

  const facts = [
    { label: 'Nota', value: media.avgScore ? (media.avgScore / 10).toFixed(1).replace('.', ',') : '—' },
    {
      label: media.mediaType === 'movie' ? 'Duração' : 'Episódios',
      value:
        media.mediaType === 'movie'
          ? `${media.episodeDuration ?? '—'}m`
          : String(media.totalEpisodes ?? '—')
    },
    { label: 'Ano', value: String(media.year ?? '—') },
    { label: 'Tipo', value: TYPE_LABEL[media.mediaType] ?? '—' }
  ];

  const content = (
    <div className="mx-auto max-w-[1180px]">
      <div className="flex flex-wrap items-start gap-[clamp(24px,4vw,52px)]">
        <div className="min-w-[150px] flex-[0_1_180px]">
          <div className="aspect-2/3 overflow-hidden bg-[#eae6e0]">
            {media.coverImage && (
              <img src={media.coverImage} alt="" className="size-full object-cover" />
            )}
          </div>

          <div className="mt-3.5 flex flex-col gap-2.5">
            <EntryDialog media={media} entry={entry} />
            {viewer && <AddToCollection media={media} />}
          </div>
        </div>

        <div className="min-w-0 flex-[1_1_min(100%,480px)]">
          <h1 className="font-mincho text-[clamp(28px,4vw,46px)] leading-[1.2] font-normal tracking-[-0.02em] text-balance text-sumi">
            {media.title}
          </h1>
          {media.titleOriginal && (
            <p className="mt-3 text-[12.5px] tracking-[0.06em] text-sumi-faint">{media.titleOriginal}</p>
          )}

          {media.stale && (
            <p className="mt-4 text-[13px] leading-[1.75] text-torii">
              A fonte externa não respondeu. Estes dados podem estar desatualizados.
            </p>
          )}

          {media.synopsis && (
            <p className="mt-[clamp(22px,3vh,30px)] max-w-[44em] text-[15.5px] leading-[1.9] font-light text-sumi-soft">
              {media.synopsis}
            </p>
          )}

          <dl className="mt-[clamp(26px,4vh,38px)] grid grid-cols-[repeat(auto-fit,minmax(min(50%,110px),1fr))] border-t border-hairline pt-[clamp(20px,3vh,26px)]">
            {facts.map((item) => (
              <div
                key={item.label}
                className="border-l border-hairline px-[clamp(14px,2vw,22px)] first:border-l-0 first:pl-0"
              >
                <dt className="text-[11px] tracking-[0.2em] text-sumi-faint uppercase">{item.label}</dt>
                <dd className="mt-3 font-mincho text-[clamp(22px,2.6vw,28px)] leading-none text-sumi">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          {creditRows.length > 0 && (
            <dl className="mt-[clamp(26px,4vh,38px)] border-t border-hairline pt-[clamp(20px,3vh,26px)]">
              {creditRows.map((row) => (
                <div key={row.label} className="flex gap-[clamp(14px,2vw,24px)] py-[7px]">
                  <dt className="w-[clamp(78px,9vw,104px)] shrink-0 text-[12.5px] tracking-[0.04em] text-sumi-faint">
                    {row.label}
                  </dt>
                  <dd className="min-w-0 text-sm leading-[1.6] text-sumi">{row.names.join(', ')}</dd>
                </div>
              ))}
            </dl>
          )}

          {media.genres.length > 0 && (
            <div className="mt-[clamp(22px,3vh,30px)] flex flex-wrap gap-2">
              {media.genres.map((genre, index) => (
                <span
                  key={`${genre}-${index}`}
                  className="border border-[#d9d4cd] px-[13px] py-1.5 text-[11.5px] tracking-[0.06em] text-sumi-soft"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <Recommendations
        source={media.source}
        mediaType={media.mediaType}
        externalId={media.externalId}
      />

      {/** Fora do grid: as reviews ocupam a largura toda, em vez de ficarem
       *   espremidas na coluna da direita. */}
      <ReviewList
        source={media.source}
        mediaType={media.mediaType}
        externalId={media.externalId}
        initial={reviews ?? { items: [], nextCursor: null, total: 0 }}
        editHref={entry ? `/review/${entry.id}` : null}
      />
    </div>
  );

  /** Logado ve a mesma navbar do resto do app: a pagina e publica, mas quem
   *  chegou da biblioteca nao pode perder a navegacao no meio do caminho. */
  if (viewer) {
    const stats = await serverFetch('/stats/activity', activityStatsSchema);
    return (
      <FeedShell viewer={viewer} streak={stats?.currentStreak ?? null}>
        {content}
      </FeedShell>
    );
  }

  return (
    <>
      <PublicHeader signedIn={false} />
      <main className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,32px)] py-[clamp(30px,5vh,52px)] pb-[clamp(60px,10vh,110px)]">
        {content}
      </main>
    </>
  );
}
