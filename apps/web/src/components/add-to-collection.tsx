'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { ApiError, apiFetch } from '@/lib/api-client';
import { CircleCheck, Library, Plus } from '@/lib/icons';
import {
  collectionSummarySchema,
  type CollectionSummary,
  type MediaDetail
} from '@watchlist/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

export function AddToCollection({ media }: { media: MediaDetail }) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<CollectionSummary[] | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  /** Carrega so ao abrir: a pagina de detalhe ja faz tres chamadas, e a maioria
   *  das visitas nunca abre este dialogo. */
  async function load() {
    if (collections !== null) return;

    try {
      const list = await apiFetch('/collections', { schema: z.array(collectionSummarySchema) });
      setCollections(list);
    } catch {
      setCollections([]);
    }
  }

  async function add(collection: CollectionSummary) {
    setBusy(collection.id);

    try {
      await apiFetch(`/collections/${collection.id}/items`, {
        method: 'POST',
        body: {
          source: media.source,
          mediaType: media.mediaType,
          externalId: media.externalId
        }
      });

      setAdded((current) => new Set(current).add(collection.id));
      toast.success(`Adicionado a ${collection.name}.`);
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível adicionar.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void load();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Library className="size-4" aria-hidden />
          Coleções
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-h3">Adicionar a uma coleção</DialogTitle>
        </DialogHeader>

        {collections === null ? (
          <p className="text-small text-fg-muted">Carregando...</p>
        ) : collections.length === 0 ? (
          <div className="space-y-3">
            <p className="text-small text-fg-muted">Você ainda não tem coleções.</p>
            <Button asChild variant="outline" className="w-full">
              <a href="/colecoes">Criar minha primeira</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {collections.map((collection) => {
              const done = added.has(collection.id);

              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => void add(collection)}
                  disabled={busy !== null || done}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-control)] p-2 text-left transition-colors duration-150 hover:bg-surface-hover disabled:opacity-60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-small">{collection.name}</p>
                    <p className="font-data text-caption text-fg-muted">
                      {collection.itemCount} {collection.itemCount === 1 ? 'obra' : 'obras'}
                      {collection.isRanked ? ' · ranqueada' : ''}
                    </p>
                  </div>

                  {done ? (
                    <CircleCheck className="size-4 shrink-0 text-success" aria-hidden />
                  ) : (
                    <Plus className="size-4 shrink-0 text-fg-muted" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}