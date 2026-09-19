'use client';

import { ApiError, apiFetch } from '@/lib/api-client';
import { ChevronDown, Trash2 } from '@/lib/icons';
import { cn } from '@/lib/utils';
import {
  searchResponseSchema,
  type CollectionDetail,
  type CollectionItem,
  type MediaSummary
} from '@watchlist/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const underlineField =
  'w-full border-0 border-b border-[#d9d4cd] bg-transparent py-2.5 text-[14.5px] font-light text-sumi transition-colors duration-400 outline-none placeholder:text-[#a8a29b] focus:border-torii';

const outlineButton =
  'cursor-pointer border border-[#d9d4cd] bg-transparent px-[22px] py-[11px] text-xs tracking-[0.12em] text-sumi uppercase transition-colors duration-400 hover:border-sumi hover:bg-sumi hover:text-washi';

function NoteEditor({
  collectionId,
  item,
  onSaved
}: {
  collectionId: string;
  item: CollectionItem;
  onSaved: (note: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(item.note ?? '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);

    try {
      await apiFetch(`/collections/${collectionId}/items/${item.mediaId}`, {
        method: 'PATCH',
        body: { note: note.trim() || null }
      });
      onSaved(note.trim() || null);
      setEditing(false);
    } catch {
      toast.error('Não foi possível salvar o comentário.');
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          'mt-1 block cursor-pointer border-0 bg-transparent p-0 text-left text-xs transition-colors duration-400',
          item.note ? 'text-sumi-soft hover:text-sumi' : 'text-[#a8a29b] italic hover:text-sumi-soft'
        )}
      >
        {item.note ?? 'sem comentário'}
      </button>
    );
  }

  return (
    <div className="mt-1.5 flex items-end gap-3">
      <input
        value={note}
        maxLength={300}
        autoFocus
        onChange={(event) => setNote(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void save();
          if (event.key === 'Escape') setEditing(false);
        }}
        placeholder="Por que essa obra está aqui?"
        className={cn(underlineField, 'py-1.5 text-[13px]')}
      />
      <button
        type="button"
        onClick={() => void save()}
        disabled={busy}
        className="shrink-0 cursor-pointer border-0 border-b border-[#d9d4cd] bg-transparent p-0 pb-1 text-xs tracking-[0.08em] text-sumi-soft transition-colors duration-400 hover:border-torii hover:text-torii disabled:opacity-50"
      >
        {busy ? '…' : 'Ok'}
      </button>
    </div>
  );
}

interface Props {
  collection: CollectionDetail;
}

export function CollectionItems({ collection }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(collection.items);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<MediaSummary[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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

  async function add(item: MediaSummary) {
    const key = `${item.source}-${item.externalId}`;
    setPending(key);

    try {
      await apiFetch(`/collections/${collection.id}/items`, {
        method: 'POST',
        body: { source: item.source, mediaType: item.mediaType, externalId: item.externalId }
      });
      setTerm('');
      setResults([]);
      router.refresh();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível adicionar.');
    } finally {
      setPending(null);
    }
  }

  async function remove(mediaId: string) {
    const previous = items;
    setItems((current) => current.filter((item) => item.mediaId !== mediaId));

    try {
      await apiFetch(`/collections/${collection.id}/items/${mediaId}`, { method: 'DELETE' });
      router.refresh();
    } catch {
      setItems(previous);
      toast.error('Não foi possível remover.');
    }
  }

  /** Mover uma posicao por vez, com os vizinhos como referencia. Arrastar
   *  exigiria uma biblioteca inteira para um ganho pequeno numa lista curta. */
  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const item = items[index]!;
    const next = [...items];
    next.splice(index, 1);
    next.splice(target, 0, item);
    setItems(next);

    const position = next.indexOf(item);
    const after = position > 0 ? next[position - 1]!.mediaId : null;
    const before = position < next.length - 1 ? next[position + 1]!.mediaId : null;

    try {
      await apiFetch(`/collections/${collection.id}/items/${item.mediaId}`, {
        method: 'PATCH',
        body: { afterMediaId: after, beforeMediaId: before }
      });
    } catch {
      setItems(items);
      toast.error('Não foi possível reordenar.');
    }
  }

  return (
    <div>
      {collection.isOwner && (
        <div className="border-b border-hairline pb-[clamp(20px,3vh,28px)]">
          {adding ? (
            <>
              <input
                autoFocus
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                onBlur={() => {
                  if (term.length === 0) setAdding(false);
                }}
                placeholder="Busque uma obra para adicionar"
                className={underlineField}
              />

              {results.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {results.map((item) => {
                    const key = `${item.source}-${item.externalId}`;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => void add(item)}
                        disabled={pending !== null}
                        title={item.title}
                        className={cn(
                          'aspect-2/3 cursor-pointer overflow-hidden border-0 bg-[#eae6e0] p-0',
                          pending === key ? 'animate-pulse' : '',
                          pending !== null && pending !== key ? 'opacity-40' : ''
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
            </>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className={outlineButton}>
              Adicionar obra
            </button>
          )}
        </div>
      )}

      <div className="mt-[clamp(26px,4vh,38px)]">
        {items.length === 0 ? (
          <p className="text-[15px] leading-[1.85] font-light text-sumi-soft">
            {collection.isOwner
              ? 'Coleção vazia. Busque uma obra acima para começar.'
              : 'Esta coleção ainda não tem obras.'}
          </p>
        ) : collection.isRanked ? (
          <div>
            {items.map((item, index) => (
              <div
                key={item.mediaId}
                className="group flex items-center gap-[clamp(14px,2vw,24px)] border-t border-hairline px-1.5 py-[clamp(12px,1.6vh,16px)] transition-colors duration-400 last:border-b hover:bg-washi-2"
              >
                <span
                  className={cn(
                    'w-[clamp(30px,3.4vw,42px)] shrink-0 text-right font-mincho text-[clamp(22px,2.4vw,28px)] leading-none',
                    index === 0 ? 'text-torii' : 'text-sumi-faint'
                  )}
                >
                  {index + 1}
                </span>

                <Link
                  href={`/media/${item.source}/${item.mediaType}/${item.externalId}`}
                  className="block h-[57px] w-[38px] shrink-0 overflow-hidden bg-[#eae6e0]"
                >
                  {item.coverImage && (
                    <img src={item.coverImage} alt="" loading="lazy" className="size-full object-cover" />
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/media/${item.source}/${item.mediaType}/${item.externalId}`}
                    className="block truncate text-[14.5px] text-sumi"
                  >
                    {item.title}
                  </Link>

                  {collection.isOwner ? (
                    <NoteEditor
                      collectionId={collection.id}
                      item={item}
                      onSaved={(note) =>
                        setItems((current) =>
                          current.map((entry) =>
                            entry.mediaId === item.mediaId ? { ...entry, note } : entry
                          )
                        )
                      }
                    />
                  ) : (
                    item.note && <p className="mt-1 text-xs text-sumi-soft">{item.note}</p>
                  )}
                </div>

                {item.ownerRating !== null && (
                  <span className="shrink-0 font-mincho text-base text-sumi">
                    {(item.ownerRating / 10).toFixed(1).replace('.', ',')}
                  </span>
                )}

                {collection.isOwner && (
                  <div className="flex shrink-0 gap-1.5 opacity-0 transition-opacity duration-400 group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => void move(index, -1)}
                      disabled={index === 0}
                      aria-label="Subir"
                      className="cursor-pointer rotate-180 border-0 bg-transparent p-0.5 text-sumi-faint transition-colors duration-400 hover:text-sumi disabled:opacity-30"
                    >
                      <ChevronDown className="size-4" strokeWidth={1.2} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label="Descer"
                      className="cursor-pointer border-0 bg-transparent p-0.5 text-sumi-faint transition-colors duration-400 hover:text-sumi disabled:opacity-30"
                    >
                      <ChevronDown className="size-4" strokeWidth={1.2} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(item.mediaId)}
                      aria-label="Remover"
                      className="cursor-pointer border-0 bg-transparent p-0.5 text-sumi-faint transition-colors duration-400 hover:text-torii"
                    >
                      <Trash2 className="size-4" strokeWidth={1.2} aria-hidden />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] gap-x-[clamp(14px,1.8vw,22px)] gap-y-[clamp(18px,2.4vw,30px)]">
            {items.map((item) => (
              <div key={item.mediaId} className="group relative">
                <Link href={`/media/${item.source}/${item.mediaType}/${item.externalId}`} className="block">
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
                    <span className="truncate text-[13.5px] leading-[1.45] text-sumi">{item.title}</span>
                    {item.ownerRating !== null && (
                      <span className="shrink-0 font-mincho text-sm text-sumi">
                        {(item.ownerRating / 10).toFixed(1).replace('.', ',')}
                      </span>
                    )}
                  </span>
                </Link>

                {collection.isOwner && (
                  <button
                    type="button"
                    onClick={() => void remove(item.mediaId)}
                    aria-label="Remover"
                    className="absolute top-1.5 right-1.5 cursor-pointer border-0 bg-washi/90 p-1 text-sumi-soft opacity-0 transition-opacity duration-400 group-hover:opacity-100 hover:text-torii focus-visible:opacity-100"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.2} aria-hidden />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
