'use client';

import { BannerPicker } from '@/components/banner-picker';
import { ApiError, apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { settingsSchema, type PresetAvatar, type Settings } from '@watchlist/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const BIO_LIMIT = 300;

const formatDuration = (minutes: number): string => {
  const hours = Math.round(minutes / 60);
  const days = Math.floor(hours / 24);
  return days > 0 ? `${days}d` : `${hours}h`;
};

const label = 'block text-[11px] tracking-[0.2em] text-sumi-faint uppercase';
const field =
  'mt-2.5 w-full border-0 border-b border-[#d9d4cd] bg-transparent py-2.5 text-[15.5px] font-light text-sumi transition-colors duration-400 outline-none placeholder:text-[#a8a29b] focus:border-torii';

interface Props {
  settings: Settings;
  avatars: PresetAvatar[];
}

export function SettingsProfile({ settings, avatars }: Props) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(settings.displayName ?? '');
  const [bio, setBio] = useState(settings.bio ?? '');
  const [avatarId, setAvatarId] = useState(settings.avatarPresetId);
  const [avatarUrl, setAvatarUrl] = useState(settings.avatarUrl);
  const [banner, setBanner] = useState<{ image: string | null; title: string | null }>({
    image: settings.bannerImage,
    title: settings.bannerTitle
  });

  const [pendingBanner, setPendingBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  async function save(patch: Record<string, unknown>, message: string) {
    setBusy(true);

    try {
      const updated = await apiFetch('/me/profile', {
        method: 'PATCH',
        body: patch,
        schema: settingsSchema
      });

      setAvatarUrl(updated.avatarUrl);
      setBanner({ image: updated.bannerImage, title: updated.bannerTitle });
      toast.success(message);
      router.refresh();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
      setPendingBanner(null);
    }
  }

  /** Botao de salvar so no perfil, onde se digita texto. As preferencias
   *  salvam sozinhas, porque sao escolhas binarias e reversiveis. */
  const dirty = displayName !== (settings.displayName ?? '') || bio !== (settings.bio ?? '');
  const visibleAvatars = showAll ? avatars : avatars.slice(0, 6);
  const name = displayName || settings.username;

  const stats = [
    { value: settings.totalEntries.toLocaleString('pt-BR'), label: 'obras' },
    { value: formatDuration(settings.totalMinutes), label: 'assistindo' },
    {
      value: String(settings.currentStreak),
      label: settings.currentStreak === 1 ? 'dia seguido' : 'dias seguidos',
      accent: true
    }
  ];

  return (
    <section id="perfil" className="scroll-mt-32">
      <h2 className="font-mincho text-[clamp(20px,2.4vw,28px)] font-normal tracking-[-0.01em] text-sumi">
        Perfil
      </h2>
      <p className="mt-2.5 text-sm leading-[1.75] font-light text-sumi-soft">
        Como você aparece para outras pessoas.
      </p>

      {/** A prévia é o próprio cabeçalho do perfil, com o que está no formulário
       *  agora: o que você edita aqui é exatamente o que a página mostra. */}
      <div className="mt-[clamp(22px,3vh,30px)]">
        <p className={label}>Prévia</p>

        <div className="mt-3.5">
          <div className="relative h-[150px] overflow-hidden bg-sumi-soft sm:h-[180px]">
            {banner.image && (
              <img src={banner.image} alt="" className="absolute inset-0 size-full object-cover" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(26,26,26,0.9)_0%,rgba(26,26,26,0.74)_40%,rgba(26,26,26,0.08)_78%,rgba(26,26,26,0)_100%)]" />

            <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-[clamp(16px,3vw,26px)]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="size-[52px] shrink-0 rounded-full border border-washi/60 object-cover"
                />
              ) : (
                <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full border border-washi/60 bg-sumi-soft font-mincho text-lg text-washi">
                  {name[0]?.toUpperCase()}
                </span>
              )}

              <div className="min-w-0">
                <p className="truncate font-mincho text-[clamp(22px,3vw,32px)] leading-[1.15] tracking-[-0.015em] text-washi">
                  {name}
                </p>
                <p className="mt-2 text-[12.5px] tracking-[0.04em] text-[#c9c4bd]">
                  @{settings.username}
                </p>
              </div>
            </div>
          </div>

          {bio && (
            <p className="mt-[clamp(18px,3vh,26px)] max-w-[40em] text-[15px] leading-[1.85] font-light text-sumi-soft">
              {bio}
            </p>
          )}

          {/** Numeros reais do viewer: previa com dado inventado nao ajuda
           *   a decidir nada. */}
          <div className="mt-[clamp(18px,3vh,26px)] flex flex-wrap items-end gap-x-[clamp(28px,4vw,52px)] gap-y-5 border-b border-hairline pb-[clamp(18px,3vh,26px)]">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p
                  className={`font-mincho text-[clamp(24px,3vw,32px)] leading-none ${stat.accent ? 'text-torii' : 'text-sumi'}`}
                >
                  {stat.value}
                </p>
                <p className="mt-2 text-xs tracking-[0.08em] text-sumi-faint">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-[clamp(28px,4vh,40px)] flex flex-col gap-[clamp(24px,3.4vh,32px)]">
        <label htmlFor="displayName" className="block">
          <span className={label}>Nome de exibição</span>
          <input
            id="displayName"
            value={displayName}
            maxLength={60}
            onChange={(event) => setDisplayName(event.target.value)}
            className={field}
          />
        </label>

        <label htmlFor="bio" className="block">
          <span className={label}>Bio</span>
          <textarea
            id="bio"
            value={bio}
            rows={3}
            maxLength={BIO_LIMIT}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Conte algo sobre o que você assiste"
            className={cn(field, 'resize-y leading-[1.7]')}
          />
          <span className="mt-1.5 block text-right font-mincho text-[13px] text-sumi-faint">
            {bio.length} / {BIO_LIMIT}
          </span>
        </label>

        {dirty && (
          <div>
            <button
              type="button"
              onClick={() =>
                void save({ displayName: displayName || null, bio: bio || null }, 'Perfil atualizado.')
              }
              disabled={busy}
              className="cursor-pointer border border-sumi bg-sumi px-6 py-3.5 text-xs tracking-[0.12em] text-washi uppercase transition-colors duration-400 hover:border-torii hover:bg-torii disabled:cursor-default disabled:opacity-50 disabled:hover:border-sumi disabled:hover:bg-sumi"
            >
              {busy ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        )}

        <div>
          <p className={label}>Avatar</p>
          <div className="mt-3.5 flex flex-wrap items-center gap-3">
            {visibleAvatars.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                onClick={() => {
                  setAvatarId(avatar.id);
                  void save({ avatarPresetId: avatar.id }, 'Avatar atualizado.');
                }}
                aria-label={avatar.name}
                className={cn(
                  'cursor-pointer rounded-full border-0 bg-transparent p-0 transition-shadow duration-400',
                  avatarId === avatar.id ? 'ring-1 ring-torii ring-offset-[3px] ring-offset-washi' : ''
                )}
              >
                <img src={avatar.imageUrl} alt="" className="size-9 rounded-full bg-[#eae6e0]" />
              </button>
            ))}

            {!showAll && avatars.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="size-9 cursor-pointer rounded-full border border-dashed border-[#b4aea6] bg-transparent font-mincho text-[13px] text-sumi-faint transition-colors duration-400 hover:border-sumi hover:text-sumi"
              >
                +{avatars.length - 6}
              </button>
            )}
          </div>
        </div>

        <BannerPicker
          tone="washi"
          current={banner.image ? { image: banner.image, title: banner.title } : null}
          pending={pendingBanner}
          onChoose={(choice) => {
            setPendingBanner(`${choice.source}-${choice.externalId}`);
            return save({ banner: choice }, 'Banner atualizado.');
          }}
          onRemove={() => save({ banner: null }, 'Banner removido.')}
        />
      </div>
    </section>
  );
}
