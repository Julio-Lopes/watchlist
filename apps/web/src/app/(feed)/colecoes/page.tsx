import { CollectionCard } from '@/components/collection-card';
import { CollectionDialog } from '@/components/collection-dialog';
import { getViewer, serverFetch } from '@/lib/api-server';
import { collectionSummarySchema } from '@watchlist/shared';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Coleções · Watchlist' };

const newButton =
  'ml-auto cursor-pointer border border-sumi bg-transparent px-[22px] py-[11px] text-xs tracking-[0.12em] text-sumi uppercase transition-colors duration-400 hover:bg-sumi hover:text-washi';

export default async function ColecoesPage() {
  const [viewer, collections] = await Promise.all([
    getViewer(),
    serverFetch('/collections', z.array(collectionSummarySchema))
  ]);

  const username = viewer?.username ?? '';
  const items = collections ?? [];

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-3 border-b border-hairline pb-4">
        <h1 className="font-mincho text-[clamp(24px,3vw,34px)] font-normal tracking-[-0.015em] text-sumi">
          Coleções
        </h1>
        {items.length > 0 && <span className="font-mincho text-sm text-sumi-faint">{items.length}</span>}

        <CollectionDialog
          username={username}
          trigger={
            <button type="button" className={newButton}>
              Nova coleção
            </button>
          }
        />
      </div>

      {items.length === 0 ? (
        <div className="mt-[clamp(34px,6vh,60px)] max-w-[34em]">
          <p className="kicker">&nbsp;·&nbsp; curadoria</p>
          <h2 className="mt-[18px] font-mincho text-[clamp(22px,2.6vw,30px)] leading-[1.3] font-normal text-sumi">
            Nenhuma coleção ainda
          </h2>
          <p className="mt-4 text-[15px] leading-[1.85] font-light text-sumi-soft">
            Coleção é curadoria, não histórico. Você pode montar uma lista de indicações sem ter
            assistido tudo.
          </p>
        </div>
      ) : (
        <div className="mt-[clamp(26px,4vh,40px)] grid grid-cols-[repeat(auto-fill,minmax(min(100%,290px),1fr))] gap-[clamp(24px,3vw,40px)]">
          {items.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} username={username} tone="washi" />
          ))}
        </div>
      )}
    </div>
  );
}
