import { AddToCollection } from '@/components/add-to-collection';
import { AppShell } from '@/components/app-shell';
import { EntryDialog } from '@/components/entry-dialog';
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

  const credits = media.credits.filter((credit) => credit.role !== 'cast');
  const cast = media.credits.filter((credit) => credit.role === 'cast');

  const content = (
    <>
      <div className="grid gap-6 md:grid-cols-[180px_minmax(0,1fr)]">
        <div>
          <div className="aspect-2/3 overflow-hidden rounded-[var(--radius-card)] bg-surface">
            {media.coverImage && (
              <img src={media.coverImage} alt="" className="size-full object-cover" />
            )}
          </div>

          <div className="mt-3 space-y-2">
            <EntryDialog media={media} entry={entry} />
            {viewer && <AddToCollection media={media} />}
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="font-serif text-h1">{media.title}</h1>
          {media.titleOriginal && (
            <p className="mt-1 text-small text-fg-muted">{media.titleOriginal}</p>
          )}

          {media.stale && (
            <p className="mt-3 text-caption text-warning">
              A fonte externa não respondeu. Estes dados podem estar desatualizados.
            </p>
          )}

          {media.synopsis && (
            <p className="mt-4 max-w-prose text-body text-fg-muted">{media.synopsis}</p>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
            {[
              { label: 'Nota', value: media.avgScore ? (media.avgScore / 10).toFixed(1) : '—' },
              {
                label: media.mediaType === 'movie' ? 'Duração' : 'Episódios',
                value:
                  media.mediaType === 'movie'
                    ? `${media.episodeDuration ?? '—'}m`
                    : (media.totalEpisodes ?? '—')
              },
              { label: 'Ano', value: media.year ?? '—' },
              { label: 'Tipo', value: TYPE_LABEL[media.mediaType] }
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-caption text-fg-muted">{item.label}</dt>
                <dd className="font-data mt-1 text-h3">{item.value}</dd>
              </div>
            ))}
          </dl>

          {credits.length > 0 && (
            <dl className="mt-4 space-y-1 border-t border-border pt-4 text-small">
              {credits.map((credit, index) => (
                <div key={`${credit.role}-${credit.name}-${index}`} className="flex gap-3">
                  <dt className="w-28 shrink-0 text-fg-muted">{ROLE_LABEL[credit.role]}</dt>
                  <dd>{credit.name}</dd>
                </div>
              ))}
            </dl>
          )}

          {cast.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-caption text-fg-muted">Elenco</p>
              <p className="mt-1 text-small">{cast.map((person) => person.name).join(', ')}</p>
            </div>
          )}

          {media.genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {media.genres.map((genre, index) => (
                <span
                  key={`${genre}-${index}`}
                  className="rounded-[var(--radius-control)] border border-border px-3 py-1 text-caption text-fg-muted"
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
    </>
  );

  /** Logado ve a mesma navbar do resto do app: a pagina e publica, mas quem
   *  chegou da biblioteca nao pode perder a navegacao no meio do caminho. */
  if (viewer) {
    const stats = await serverFetch('/stats/activity', activityStatsSchema);
    return (
      <AppShell viewer={viewer} streak={stats?.currentStreak ?? null}>
        {content}
      </AppShell>
    );
  }

  return (
    <>
      <PublicHeader signedIn={false} />
      <main className="mx-auto max-w-[1280px] px-4 py-10 md:px-6 lg:px-8">{content}</main>
    </>
  );
}