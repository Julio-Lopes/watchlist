'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { CollectionSummary } from '@watchlist/shared';
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

  const toggle = (active: boolean) =>
    cn(
      'rounded-[var(--radius-control)] border px-3 py-1 text-small transition-colors duration-150',
      active ? 'border-accent bg-accent text-fg' : 'border-border text-fg-muted hover:text-fg'
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-h3">
            {collection ? 'Editar coleção' : 'Nova coleção'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            placeholder="Para quem nunca viu anime"
            autoFocus
          />

          <Textarea
            value={description}
            rows={2}
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descrição, opcional"
          />

          <div>
            <p className="text-small text-fg-muted">Visibilidade</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setIsPublic(true)} className={toggle(isPublic)}>
                Pública
              </button>
              <button type="button" onClick={() => setIsPublic(false)} className={toggle(!isPublic)}>
                Privada
              </button>
            </div>
          </div>

          <div>
            <p className="text-small text-fg-muted">Formato</p>
            {/** Ranqueada mostra a posicao; comum nao. Numa lista sem ordem
             *   intencional, o numero seria ruido. */}
            <p className="mt-0.5 text-caption text-fg-muted">
              Ranqueada mostra a posição de cada obra e permite comentar item por item.
            </p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setIsRanked(false)} className={toggle(!isRanked)}>
                Lista
              </button>
              <button type="button" onClick={() => setIsRanked(true)} className={toggle(isRanked)}>
                Ranqueada
              </button>
            </div>
          </div>

          <BannerPicker
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
            <p className="text-caption text-accent">
              Capa escolhida. Ela aparece depois de salvar.
            </p>
          )}

          <Button
            onClick={() => void save()}
            disabled={busy || name.trim().length === 0}
            className="w-full"
          >
            {busy ? 'Salvando...' : collection ? 'Salvar' : 'Criar coleção'}
          </Button>

          {collection && (
            <div className="border-t border-border pt-4">
              {deleting ? (
                <div className="space-y-2">
                  <p className="text-small text-fg-muted">
                    Apagar <span className="text-fg">{collection.name}</span> e suas{' '}
                    {collection.itemCount} obras? Não dá para desfazer.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => void remove()}
                      disabled={busy}
                      className="flex-1 bg-danger hover:bg-danger/90"
                    >
                      {busy ? 'Apagando...' : 'Apagar'}
                    </Button>
                    <Button variant="outline" onClick={() => setDeleting(false)} className="flex-1">
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                /** Confirmacao em dois passos, sem dialogo aninhado: abrir um
                 *  modal dentro de outro quebra o foco e o Escape. */
                <button
                  type="button"
                  onClick={() => setDeleting(true)}
                  className="text-small text-fg-muted transition-colors duration-150 hover:text-danger"
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