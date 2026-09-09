'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  searchResponseSchema,
  settingsSchema,
  type MediaSummary,
  type PresetAvatar,
  type Settings
} from '@watchlist/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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

  const [term, setTerm] = useState('');
  const [results, setResults] = useState<MediaSummary[]>([]);
  const [pendingBanner, setPendingBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const page = await apiFetch(`/media/search?q=${encodeURIComponent(term)}`, {
          schema: searchResponseSchema,
          signal: controller.signal
        });
        setResults(page.results.slice(0, 8));
      } catch {
        setResults([]);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

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

  async function chooseBanner(item: MediaSummary) {
    /** getMediaDetail pode bater na fonte externa na primeira vez, entao o
     *  clique precisa de estado visivel de carregamento. */
    setPendingBanner(`${item.source}-${item.externalId}`);

    await save(
      { banner: { source: item.source, mediaType: item.mediaType, externalId: item.externalId } },
      'Banner atualizado.'
    );

    setTerm('');
    setResults([]);
  }

  const dirty = displayName !== (settings.displayName ?? '') || bio !== (settings.bio ?? '');
  const visibleAvatars = showAll ? avatars : avatars.slice(0, 6);

  return (
    <section id="perfil" className="scroll-mt-28 rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6">
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
                    avatarId === avatar.id ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''
                  )}
                >
                  <img src={avatar.imageUrl} alt="" className="size-8 rounded-full bg-surface-hover" />
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

          <div>
            <p className="text-small text-fg-muted">Banner</p>
            {banner.image && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={banner.image}
                  alt=""
                  className="h-8 w-28 rounded-[var(--radius-control)] object-cover"
                />
                <span className="min-w-0 flex-1 truncate text-caption text-fg-muted">
                  {banner.title}
                </span>
                <button
                  type="button"
                  onClick={() => void save({ banner: null }, 'Banner removido.')}
                  className="text-caption text-fg-muted hover:text-danger"
                >
                  Remover
                </button>
              </div>
            )}

            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Busque uma obra para usar como banner"
              className="mt-2"
            />

            {results.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
                {results.map((item) => {
                  const key = `${item.source}-${item.externalId}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => void chooseBanner(item)}
                      disabled={pendingBanner !== null}
                      title={item.title}
                      className={cn(
                        'aspect-2/3 overflow-hidden rounded-[var(--radius-control)] bg-surface-hover transition-opacity duration-150',
                        pendingBanner === key ? 'animate-pulse' : '',
                        pendingBanner !== null && pendingBanner !== key ? 'opacity-40' : ''
                      )}
                    >
                      {item.coverImage && (
                        <img src={item.coverImage} alt="" className="size-full object-cover" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/** Sem esse aviso, escolher uma obra sem banner e receber erro
             *   pareceria bug em vez de limitação da fonte. */}
            <p className="mt-2 text-caption text-fg-muted">
              Nem toda obra tem banner. Se a escolhida não tiver, avisamos e você tenta outra.
            </p>
          </div>
        </div>

        <div>
          <p className="text-caption tracking-wide text-fg-muted uppercase">Prévia</p>
          <div className="mt-2 overflow-hidden rounded-[var(--radius-card)] border border-border bg-bg">
            <div className="relative h-16 bg-gradient-to-r from-[#241a3d] to-[#3b2a5e]">
              {banner.image && (
                <img src={banner.image} alt="" className="size-full object-cover" />
              )}
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