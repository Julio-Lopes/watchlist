'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, apiFetch } from '@/lib/api-client';
import { ChevronDown, Plus, Trash2 } from '@/lib/icons';
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
          'mt-1 block text-left text-caption',
          item.note ? 'text-fg-muted' : 'italic text-border hover:text-fg-muted'
        )}
      >
        {item.note ?? 'sem comentário'}
      </button>
    );
  }

  return (
    <div className="mt-1.5 flex gap-2">
      <Input
        value={note}
        maxLength={300}
        autoFocus
        onChange={(event) => setNote(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void save();
          if (event.key === 'Escape') setEditing(false);
        }}
        placeholder="Por que essa obra está aqui?"
        className="h-8 text-small"
      />
      <Button size="sm" onClick={() => void save()} disabled={busy}>
        {busy ? '...' : 'Ok'}
      </Button>
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
    <div className="space-y-4">
      {collection.isOwner && (
        <div>
          {adding ? (
            <>
              <Input
                autoFocus
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                onBlur={() => {
                  if (term.length === 0) setAdding(false);
                }}
                placeholder="Busque uma obra para adicionar"
              />

              {results.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
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
                          'aspect-2/3 overflow-hidden rounded-[var(--radius-control)] bg-surface-hover',
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
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden />
              Adicionar obra
            </Button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-small text-fg-muted">
          {collection.isOwner
            ? 'Coleção vazia. Busque uma obra acima para começar.'
            : 'Esta coleção ainda não tem obras.'}
        </p>
      ) : collection.isRanked ? (
        <div className="space-y-1">
          {items.map((item, index) => (
            <div
              key={item.mediaId}
              className={cn(
                'group flex items-center gap-4 rounded-[var(--radius-card)] p-2.5 md:gap-5',
                index === 0 ? 'border border-border bg-surface' : ''
              )}
            >
              <span
                className={cn(
                  'w-8 shrink-0 text-center font-serif text-[29px] leading-none',
                  index === 0 ? 'text-accent' : 'text-border'
                )}
              >
                {index + 1}
              </span>

              <Link
                href={`/media/${item.source}/${item.mediaType}/${item.externalId}`}
                className="h-[57px] w-[38px] shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-surface-hover"
              >
                {item.coverImage && (
                  <img src={item.coverImage} alt="" loading="lazy" className="size-full object-cover" />
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/media/${item.source}/${item.mediaType}/${item.externalId}`}
                  className="truncate text-small hover:underline"
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
                  item.note && <p className="mt-1 text-caption text-fg-muted">{item.note}</p>
                )}
              </div>

              {item.ownerRating !== null && (
                <span className="font-data shrink-0 text-body">
                  {(item.ownerRating / 10).toFixed(1).replace('.', ',')}
                </span>
              )}

              {collection.isOwner && (
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => void move(index, -1)}
                    disabled={index === 0}
                    aria-label="Subir"
                    className="rotate-180 text-fg-muted hover:text-fg disabled:opacity-30"
                  >
                    <ChevronDown className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label="Descer"
                    className="text-fg-muted hover:text-fg disabled:opacity-30"
                  >
                    <ChevronDown className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(item.mediaId)}
                    aria-label="Remover"
                    className="text-fg-muted hover:text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => (
            <div key={item.mediaId} className="group relative">
              <Link href={`/media/${item.source}/${item.mediaType}/${item.externalId}`}>
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
                  {item.ownerRating !== null && (
                    <span className="font-data shrink-0 text-caption text-accent">
                      {(item.ownerRating / 10).toFixed(1).replace('.', ',')}
                    </span>
                  )}
                </div>
              </Link>

              {collection.isOwner && (
                <button
                  type="button"
                  onClick={() => void remove(item.mediaId)}
                  aria-label="Remover"
                  className="absolute right-1.5 top-1.5 rounded-[var(--radius-control)] bg-bg/80 p-1 text-fg-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-danger"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}