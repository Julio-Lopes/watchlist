'use client';

import { BannerPicker } from '@/components/banner-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

  return (
    <section
      id="perfil"
      className="scroll-mt-28 rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6"
    >
      <h2 className="text-h3">Perfil</h2>
      <p className="mt-0.5 text-small text-fg-muted">Como você aparece para outras pessoas.</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-5">
          <div>
            <label htmlFor="displayName" className="text-small text-fg-muted">
              Nome de exibição
            </label>
            <Input
              id="displayName"
              value={displayName}
              maxLength={60}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <label htmlFor="bio" className="text-small text-fg-muted">
              Bio
            </label>
            <Textarea
              id="bio"
              value={bio}
              rows={3}
              maxLength={BIO_LIMIT}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Conte algo sobre o que você assiste"
              className="mt-1.5"
            />
            <p className="font-data mt-1 text-right text-caption text-fg-muted">
              {bio.length} / {BIO_LIMIT}
            </p>
          </div>

          {dirty && (
            <Button
              onClick={() =>
                void save(
                  { displayName: displayName || null, bio: bio || null },
                  'Perfil atualizado.'
                )
              }
              disabled={busy}
            >
              {busy ? 'Salvando...' : 'Salvar'}
            </Button>
          )}

          <div>
            <p className="text-small text-fg-muted">Avatar</p>
            <div className="mt-2 flex flex-wrap gap-2">
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
                    'rounded-full transition-shadow duration-150',
                    avatarId === avatar.id
                      ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface'
                      : ''
                  )}
                >
                  <img
                    src={avatar.imageUrl}
                    alt=""
                    className="size-8 rounded-full bg-surface-hover"
                  />
                </button>
              ))}

              {!showAll && avatars.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="font-data size-8 rounded-full border border-dashed border-fg-muted text-caption text-fg-muted"
                >
                  +{avatars.length - 6}
                </button>
              )}
            </div>
          </div>

          <BannerPicker
            current={banner.image ? { image: banner.image, title: banner.title } : null}
            pending={pendingBanner}
            onChoose={(choice) => {
              setPendingBanner(`${choice.source}-${choice.externalId}`);
              return save({ banner: choice }, 'Banner atualizado.');
            }}
            onRemove={() => save({ banner: null }, 'Banner removido.')}
          />
        </div>

        <div>
          <p className="text-caption tracking-wide text-fg-muted uppercase">Prévia</p>
          <div className="mt-2 overflow-hidden rounded-[var(--radius-card)] border border-border bg-bg">
            <div className="relative h-16 bg-gradient-to-r from-[#241a3d] to-[#3b2a5e]">
              {banner.image && <img src={banner.image} alt="" className="size-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
              <div className="absolute bottom-2 left-3 flex items-end gap-2">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="size-8 rounded-full border-2 border-bg" />
                ) : (
                  <span className="size-8 rounded-full border-2 border-bg bg-surface-hover" />
                )}
                <div className="pb-0.5">
                  <p className="font-serif text-small leading-none">
                    {displayName || settings.username}
                  </p>
                  <p className="font-data mt-0.5 text-caption text-fg-muted">
                    @{settings.username}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3">
              {bio && <p className="text-caption text-fg-muted">{bio}</p>}
              {/** Numeros reais do viewer: previa com dado inventado nao ajuda
               *   a decidir nada. */}
              <div className="mt-2.5 flex gap-4">
                <div>
                  <p className="font-data text-small">{settings.totalEntries}</p>
                  <p className="text-caption text-fg-muted">obras</p>
                </div>
                <div>
                  <p className="font-data text-small">{formatDuration(settings.totalMinutes)}</p>
                  <p className="text-caption text-fg-muted">assistindo</p>
                </div>
                <div>
                  <p className="font-data text-small text-accent">{settings.currentStreak}</p>
                  <p className="text-caption text-fg-muted">
                    {settings.currentStreak === 1 ? 'dia' : 'dias'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-2 text-caption text-fg-muted">É assim que as pessoas veem seu perfil.</p>
        </div>
      </div>
    </section>
  );
}