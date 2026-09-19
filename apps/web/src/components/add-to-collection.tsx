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
import { CircleCheck, Plus } from '@/lib/icons';
import {
  collectionSummarySchema,
  type CollectionSummary,
  type MediaDetail
} from '@watchlist/shared';
import { X } from 'lucide-react';
import Link from 'next/link';
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
        <button
          type="button"
          className="w-full cursor-pointer border border-[#d9d4cd] bg-transparent px-5 py-[13px] text-xs tracking-[0.12em] text-sumi uppercase transition-colors duration-400 hover:border-sumi hover:bg-sumi hover:text-washi"
        >
          Coleções
        </button>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-none border-hairline bg-washi p-[clamp(24px,3vw,34px)] font-jp text-sumi shadow-none sm:max-w-[520px]"
      >
        <DialogHeader className="flex-row items-baseline gap-4 border-b border-hairline pb-[18px] text-left">
          <DialogTitle className="font-mincho text-[22px] leading-normal font-normal tracking-[-0.01em]">
            Adicionar a uma coleção
          </DialogTitle>
          <DialogClose
            aria-label="Fechar"
            className="ml-auto flex cursor-pointer border-0 bg-transparent p-1 text-sumi-soft transition-colors duration-400 hover:text-sumi"
          >
            <X className="size-4" strokeWidth={1.2} aria-hidden />
          </DialogClose>
        </DialogHeader>

        <div className="mt-5">
          {collections === null ? (
            <p className="text-sm font-light text-sumi-soft">Carregando…</p>
          ) : collections.length === 0 ? (
            <div>
              <p className="text-[15px] leading-[1.85] font-light text-sumi-soft">
                Você ainda não tem coleções.
              </p>
              <Link
                href="/colecoes"
                className="mt-4 inline-block border border-[#d9d4cd] px-[22px] py-[11px] text-xs tracking-[0.12em] text-sumi uppercase transition-colors duration-400 hover:border-sumi hover:bg-sumi hover:text-washi"
              >
                Criar minha primeira
              </Link>
            </div>
          ) : (
            <div className="border-t border-hairline">
              {collections.map((collection) => {
                const done = added.has(collection.id);

                return (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => void add(collection)}
                    disabled={busy !== null || done}
                    className="flex w-full cursor-pointer items-center gap-3 border-0 border-b border-hairline bg-transparent px-1 py-3 text-left transition-colors duration-400 hover:bg-washi-2 disabled:cursor-default disabled:opacity-60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-sumi">{collection.name}</span>
                      <span className="mt-1 block text-xs text-sumi-faint">
                        <span className="font-mincho text-[13px] text-sumi-soft">
                          {collection.itemCount} {collection.itemCount === 1 ? 'obra' : 'obras'}
                        </span>
                        {collection.isRanked && (
                          <span className="ml-3 tracking-[0.14em] text-torii uppercase">ranqueada</span>
                        )}
                      </span>
                    </span>

                    {done ? (
                      <CircleCheck className="size-4 shrink-0 text-torii" strokeWidth={1.2} aria-hidden />
                    ) : (
                      <Plus className="size-4 shrink-0 text-sumi-faint" strokeWidth={1.2} aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
