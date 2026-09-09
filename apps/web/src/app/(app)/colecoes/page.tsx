import { CollectionCard } from '@/components/collection-card';
import { CollectionDialog } from '@/components/collection-dialog';
import { Button } from '@/components/ui/button';
import { Plus } from '@/lib/icons';
import { getViewer, serverFetch } from '@/lib/api-server';
import { collectionSummarySchema } from '@watchlist/shared';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Coleções · Watchlist' };

export default async function ColecoesPage() {
  const [viewer, collections] = await Promise.all([
    getViewer(),
    serverFetch('/collections', z.array(collectionSummarySchema))
  ]);

  const username = viewer?.username ?? '';
  const items = collections ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-h2">Coleções</h1>
          {items.length > 0 && (
            <span className="font-data text-caption text-fg-muted">{items.length}</span>
          )}
        </div>

        <CollectionDialog
          username={username}
          trigger={
            <Button size="sm">
              <Plus className="size-4" aria-hidden />
              Nova coleção
            </Button>
          }
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
          <p className="text-body">Nenhuma coleção ainda</p>
          <p className="mx-auto mt-1 max-w-sm text-small text-fg-muted">
            Coleção é curadoria, não histórico. Você pode montar uma lista de indicações sem ter
            assistido tudo.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} username={username} />
          ))}
        </div>
      )}
    </div>
  );
}