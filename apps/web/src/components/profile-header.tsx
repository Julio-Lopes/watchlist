import { FollowButton } from '@/components/follow-button';
import { Heatmap } from '@/components/heatmap';
import { Button } from '@/components/ui/button';
import type { PublicProfile } from '@watchlist/shared';
import Link from 'next/link';

const TIER_CLASS: Record<string, string> = {
  bronze: 'bg-heat-1',
  silver: 'bg-heat-2',
  gold: 'bg-heat-3',
  platinum: 'bg-heat-4'
};

const formatDuration = (minutes: number): string => {
  const hours = Math.round(minutes / 60);
  const days = Math.floor(hours / 24);
  return days > 0 ? `${days}d` : `${hours}h`;
};

export function ProfileHeader({ profile }: { profile: PublicProfile }) {
  const stats = [
    { value: profile.totalEntries.toLocaleString('pt-BR'), label: 'obras' },
    { value: formatDuration(profile.totalMinutes), label: 'assistindo' },
    {
      value:
        profile.averageRating !== null
          ? (profile.averageRating / 10).toFixed(1).replace('.', ',')
          : '—',
      label: 'nota média'
    },
    {
      value: String(profile.currentStreak),
      label: profile.currentStreak === 1 ? 'dia seguido' : 'dias seguidos',
      accent: true
    }
  ];

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      {/** O banner sai de media.banner_image de uma obra escolhida pela pessoa.
       *   Sem banner definido, o degrade do tema preenche sem parecer erro. */}
      <div className="relative h-32 bg-gradient-to-r from-[#241a3d] via-accent/40 to-[#2a4258] md:h-40">
        {profile.bannerImage && (
          <img
            src={profile.bannerImage}
            alt=""
            className="size-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />

        <div className="absolute inset-x-4 bottom-3 flex items-end gap-3 md:inset-x-6">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="size-13 shrink-0 rounded-full border-2 border-surface md:size-14"
            />
          ) : (
            <span className="size-13 shrink-0 rounded-full border-2 border-surface bg-surface-hover md:size-14" />
          )}

          <div className="min-w-0 flex-1 pb-0.5">
            <h1 className="truncate font-serif text-h2">
              {profile.displayName ?? profile.username}
            </h1>
            <p className="font-data mt-0.5 text-caption text-fg-muted">
              @{profile.username} · {profile.followers}{' '}
              {profile.followers === 1 ? 'seguidor' : 'seguidores'}
            </p>
          </div>

          {profile.isSelf ? (
            <>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href={`/wrapped/${profile.username}/${new Date().getFullYear()}`}>
                  Wrapped
                </Link>
              </Button>
              <Link
                href="/config"
                className="shrink-0 rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-small transition-colors duration-150 hover:bg-surface-hover"
              >
                Editar perfil
              </Link>
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href={`/wrapped/${profile.username}/${new Date().getFullYear()}`}>
                  Wrapped
                </Link>
              </Button>
              {profile.isFollowing !== null && (
                <FollowButton username={profile.username} initialFollowing={profile.isFollowing} />
              )}
            </>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 md:px-6">
        {profile.bio && <p className="max-w-prose text-small text-fg-muted">{profile.bio}</p>}

        <div className="mt-4 flex flex-wrap items-start gap-6 border-b border-border pb-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className={`font-data text-h3 ${stat.accent ? 'text-accent' : ''}`}>{stat.value}</p>
              <p className="text-caption text-fg-muted">{stat.label}</p>
            </div>
          ))}

          {profile.badges.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              {profile.badges.slice(0, 4).map((badge) => (
                <span
                  key={badge.slug}
                  title={`${badge.name}${badge.description ? ` · ${badge.description}` : ''}`}
                  className={`flex size-7 items-center justify-center rounded-[var(--radius-control)] text-caption ${TIER_CLASS[badge.tier] ?? 'bg-surface-hover'}`}
                >
                  {badge.name.slice(0, 1)}
                </span>
              ))}
              {profile.badges.length > 4 && (
                <span className="font-data text-caption text-fg-muted">
                  +{profile.badges.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {profile.favorites.length > 0 && (
        <div className="px-4 pt-4 md:px-6">
          <p className="text-caption tracking-wide text-fg-muted uppercase">Favoritos</p>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {profile.favorites.map((item) => (
              <Link
                key={item.id}
                href={`/media/${item.source}/${item.mediaType}/${item.externalId}`}
                className="group"
              >
                <div className="aspect-2/3 overflow-hidden rounded-[var(--radius-card)] bg-surface-hover">
                  {item.coverImage && (
                    <img
                      src={item.coverImage}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  )}
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-caption">{item.title}</span>
                  {item.userRating !== null && (
                    <span className="font-data shrink-0 text-caption text-accent">
                      {(item.userRating / 10).toFixed(1).replace('.', ',')}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {profile.totalEpisodes > 0 && (
        <div className="px-4 py-4 md:px-6">
          <Heatmap days={profile.activity} />
        </div>
      )}
    </div>
  );
}