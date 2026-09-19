'use client';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { ApiError, apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { CollectionSummary } from '@watchlist/shared';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { BannerPicker, type BannerChoice } from './banner-picker';

const createdSchema = z.object({ id: z.uuid(), slug: z.string() });

interface Props {
  username: string;
  collection?: CollectionSummary;
  trigger: React.ReactNode;
}

const label = 'block text-[11px] tracking-[0.2em] text-sumi-faint uppercase';
const field =
  'mt-2.5 w-full border-0 border-b border-[#d9d4cd] bg-transparent py-2.5 text-[15.5px] font-light text-sumi transition-colors duration-400 outline-none placeholder:text-[#a8a29b] focus:border-torii';

export function CollectionDialog({ username, collection, trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(collection?.name ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');
  const [isPublic, setIsPublic] = useState(collection?.isPublic ?? true);
  const [isRanked, setIsRanked] = useState(collection?.isRanked ?? false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cover, setCover] = useState<BannerChoice | null>(null);
  const [coverImage, setCoverImage] = useState(collection?.coverImage ?? null);
  const [coverRemoved, setCoverRemoved] = useState(false);

  async function save() {
    setBusy(true);

    try {
      if (collection) {
        await apiFetch(`/collections/${collection.id}`, {
          method: 'PATCH',
          body: {
            name,
            description: description || null,
            isPublic,
            isRanked,
            ...(cover ? { cover } : coverRemoved ? { cover: null } : {})
          }
        });
        setOpen(false);
        router.refresh();
        toast.success('Coleção atualizada.');
      } else {
        const created = await apiFetch('/collections', {
          method: 'POST',
          body: {
            name,
            description: description || null,
            isPublic,
            isRanked,
            ...(cover ? { cover } : coverRemoved ? { cover: null } : {})
          },
          schema: createdSchema
        });
        setOpen(false);
        router.push(`/c/${username}/${created.slug}`);
      }
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!collection) return;
    setBusy(true);

    try {
      await apiFetch(`/collections/${collection.id}`, { method: 'DELETE' });
      setOpen(false);
      router.push('/colecoes');
      router.refresh();
      toast.success('Coleção apagada.');
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível apagar.');
      setBusy(false);
    }
  }

  /** O segmentado é a única coisa preenchida em sumi: é o estado, não uma ação. */
  const segment = (active: boolean) =>
    cn(
      'cursor-pointer border px-[18px] py-[9px] text-[12.5px] tracking-[0.06em] transition-colors duration-400',
      active
        ? 'border-sumi bg-sumi text-washi'
        : 'border-[#d9d4cd] bg-transparent text-sumi-soft hover:border-sumi'
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-none border-hairline bg-washi p-[clamp(24px,3vw,34px)] font-jp text-sumi shadow-none sm:max-w-[520px]"
      >
        <DialogHeader className="flex-row items-baseline gap-4 border-b border-hairline pb-[18px] text-left">
          <DialogTitle className="font-mincho text-[22px] leading-normal font-normal tracking-[-0.01em]">
            {collection ? 'Editar coleção' : 'Nova coleção'}
          </DialogTitle>
          <DialogClose
            aria-label="Fechar"
            className="ml-auto flex cursor-pointer border-0 bg-transparent p-1 text-sumi-soft transition-colors duration-400 hover:text-sumi"
          >
            <X className="size-4" strokeWidth={1.2} aria-hidden />
          </DialogClose>
        </DialogHeader>

        <div className="mt-6 flex flex-col gap-[26px]">
          <label className="block">
            <span className={label}>Nome</span>
            <input
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              placeholder="Para quem nunca viu anime"
              autoFocus
              className={field}
            />
          </label>

          <label className="block">
            <span className={label}>Descrição, opcional</span>
            <textarea
              value={description}
              rows={2}
              maxLength={500}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Uma linha sobre o que reúne estas obras"
              className={cn(field, 'resize-y leading-[1.7]')}
            />
          </label>

          <div>
            <p className={label}>Visibilidade</p>
            <div className="mt-3 flex gap-2.5">
              <button type="button" onClick={() => setIsPublic(true)} className={segment(isPublic)}>
                Pública
              </button>
              <button type="button" onClick={() => setIsPublic(false)} className={segment(!isPublic)}>
                Privada
              </button>
            </div>
          </div>

          <div>
            <p className={label}>Formato</p>
            {/** Ranqueada mostra a posicao; comum nao. Numa lista sem ordem
             *   intencional, o numero seria ruido. */}
            <p className="mt-2.5 max-w-[38em] text-[12.5px] leading-[1.75] font-light text-sumi-soft">
              Ranqueada mostra a posição de cada obra e permite comentar item por item.
            </p>
            <div className="mt-3 flex gap-2.5">
              <button type="button" onClick={() => setIsRanked(false)} className={segment(!isRanked)}>
                Lista
              </button>
              <button type="button" onClick={() => setIsRanked(true)} className={segment(isRanked)}>
                Ranqueada
              </button>
            </div>
          </div>

          <BannerPicker
            tone="washi"
            label="Capa"
            current={coverImage ? { image: coverImage, title: null } : null}
            pending={null}
            onChoose={(choice) => {
              setCover(choice);
              setCoverRemoved(false);
            }}
            onRemove={() => {
              setCover(null);
              setCoverImage(null);
              setCoverRemoved(true);
            }}
          />

          {cover && (
            <p className="-mt-3 text-xs text-torii">Capa escolhida. Ela aparece depois de salvar.</p>
          )}

          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || name.trim().length === 0}
            className="cursor-pointer border border-sumi bg-sumi px-6 py-[15px] text-[12.5px] tracking-[0.12em] text-washi uppercase transition-colors duration-400 hover:border-torii hover:bg-torii disabled:cursor-default disabled:opacity-50 disabled:hover:border-sumi disabled:hover:bg-sumi"
          >
            {busy ? 'Salvando…' : collection ? 'Salvar' : 'Criar coleção'}
          </button>

          {collection && (
            <div className="border-t border-hairline pt-[22px]">
              {deleting ? (
                <div className="space-y-3">
                  <p className="text-[13px] leading-[1.75] text-sumi-soft">
                    Apagar <span className="text-sumi">{collection.name}</span> e suas{' '}
                    {collection.itemCount} obras? Não dá para desfazer.
                  </p>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => void remove()}
                      disabled={busy}
                      className="flex-1 cursor-pointer border border-torii bg-torii px-4 py-3 text-xs tracking-[0.12em] text-washi uppercase transition-opacity duration-400 hover:opacity-85 disabled:opacity-50"
                    >
                      {busy ? 'Apagando…' : 'Apagar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(false)}
                      className="flex-1 cursor-pointer border border-[#d9d4cd] bg-transparent px-4 py-3 text-xs tracking-[0.12em] text-sumi uppercase transition-colors duration-400 hover:border-sumi"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /** Confirmacao em dois passos, sem dialogo aninhado: abrir um
                 *  modal dentro de outro quebra o foco e o Escape. */
                <button
                  type="button"
                  onClick={() => setDeleting(true)}
                  className="cursor-pointer border-0 bg-transparent p-0 text-[13px] tracking-[0.04em] text-sumi-faint transition-colors duration-400 hover:text-torii"
                >
                  Apagar coleção
                </button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
