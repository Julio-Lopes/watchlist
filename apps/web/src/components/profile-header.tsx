import { FollowButton } from '@/components/follow-button';
import { Heatmap } from '@/components/heatmap';
import type { PublicProfile } from '@watchlist/shared';
import Link from 'next/link';

/** O nível do selo vira densidade de tinta, não cor: contorno vazado, papel um
 *  tom, sumi cheio, torii. Continua legível em preto e branco. */
const TIER_CLASS: Record<string, string> = {
  bronze: 'border-[#d9d4cd] bg-transparent text-sumi-soft',
  silver: 'border-[#b4aea6] bg-[#ece8e2] text-sumi',
  gold: 'border-sumi bg-sumi text-washi',
  platinum: 'border-torii bg-torii text-washi'
};

const formatDuration = (minutes: number): string => {
  const hours = Math.round(minutes / 60);
  const days = Math.floor(hours / 24);
  return days > 0 ? `${days}d` : `${hours}h`;
};

const actionButton =
  'inline-block border border-[#d9d4cd] px-5 py-2.5 text-[11.5px] tracking-[0.12em] text-sumi uppercase transition-colors duration-400 hover:border-sumi hover:bg-sumi hover:text-washi';

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

  const name = profile.displayName ?? profile.username;

  return (
    <div>
      {/** O banner sai de media.banner_image de uma obra escolhida pela pessoa.
       *   O véu sumi garante o contraste do nome sobre qualquer imagem. */}
      <div className="relative h-[170px] overflow-hidden bg-sumi-soft sm:h-[200px] lg:h-[220px]">
        {profile.bannerImage && (
          <img src={profile.bannerImage} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(26,26,26,0.9)_0%,rgba(26,26,26,0.74)_40%,rgba(26,26,26,0.08)_78%,rgba(26,26,26,0)_100%)]" />

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end gap-4 p-[clamp(18px,3vw,30px)]">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="size-[52px] shrink-0 rounded-full border border-washi/60 object-cover"
            />
          ) : (
            <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full border border-washi/60 bg-sumi-soft font-mincho text-lg text-washi">
              {name[0]?.toUpperCase()}
            </span>
          )}

          <div className="min-w-0">
            <h1 className="truncate font-mincho text-[clamp(24px,3.2vw,36px)] font-normal tracking-[-0.015em] text-washi">
              {name}
            </h1>
            <p className="mt-2 text-[12.5px] tracking-[0.04em] text-[#c9c4bd]">
              @{profile.username} · {profile.followers}{' '}
              {profile.followers === 1 ? 'seguidor' : 'seguidores'}
            </p>
          </div>

        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2.5">
        <Link href={`/wrapped/${profile.username}/${new Date().getFullYear()}`} className={actionButton}>
          Wrapped
        </Link>

        {profile.isSelf ? (
          <Link href="/config" className={actionButton}>
            Editar perfil
          </Link>
        ) : (
          profile.isFollowing !== null && (
            <FollowButton username={profile.username} initialFollowing={profile.isFollowing} />
          )
        )}
      </div>

      <div className="pt-[clamp(16px,3vh,28px)]">
        {profile.bio && (
          <p className="max-w-[40em] text-[15px] leading-[1.85] font-light text-sumi-soft">
            {profile.bio}
          </p>
        )}

        <div className="mt-[clamp(24px,4vh,36px)] flex flex-wrap items-end gap-x-[clamp(28px,4vw,52px)] gap-y-6 border-b border-hairline pb-[clamp(22px,3vh,30px)]">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p
                className={`font-mincho text-[clamp(28px,3.4vw,38px)] leading-none ${stat.accent ? 'text-torii' : 'text-sumi'}`}
              >
                {stat.value}
              </p>
              <p className="mt-2 text-xs tracking-[0.08em] text-sumi-faint">{stat.label}</p>
            </div>
          ))}

          {profile.badges.length > 0 && (
            <div className="ml-auto flex items-end gap-2">
              {profile.badges.slice(0, 4).map((badge) => (
                <Link
                  key={badge.slug}
                  href="/badges"
                  title={`${badge.name}${badge.description ? ` · ${badge.description}` : ''}`}
                  className={`flex size-[30px] items-center justify-center border font-mincho text-[13px] ${TIER_CLASS[badge.tier] ?? TIER_CLASS.bronze}`}
                >
                  {badge.name.slice(0, 1)}
                </Link>
              ))}
              {profile.badges.length > 4 && (
                <span className="pb-1 font-mincho text-[13px] text-sumi-faint">
                  +{profile.badges.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {profile.favorites.length > 0 && (
        <div className="mt-[clamp(24px,4vh,34px)]">
          <p className="text-[11px] tracking-[0.2em] text-sumi-faint uppercase">Favoritos</p>
          <div className="mt-3.5 grid max-w-[560px] grid-cols-4 gap-[clamp(12px,1.8vw,20px)]">
            {profile.favorites.map((item) => (
              <Link
                key={item.id}
                href={`/media/${item.source}/${item.mediaType}/${item.externalId}`}
                className="block"
              >
                <span className="block aspect-2/3 overflow-hidden bg-[#eae6e0]">
                  {item.coverImage && (
                    <img
                      src={item.coverImage}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  )}
                </span>
                <span className="mt-2.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] text-sumi">{item.title}</span>
                  {item.userRating !== null && (
                    <span className="shrink-0 font-mincho text-[13.5px] text-sumi">
                      {(item.userRating / 10).toFixed(1).replace('.', ',')}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {profile.totalEpisodes > 0 && (
        <div className="mt-[clamp(24px,4vh,34px)]">
          <Heatmap days={profile.activity} tone="washi" />
        </div>
      )}
    </div>
  );
}
