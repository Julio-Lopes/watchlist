import { SearchPanel } from '@/components/search-panel';

export const metadata = { title: 'Buscar · Watchlist' };

export default async function BuscarPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-4 py-10 md:px-6 lg:px-8">
      <h1 className="font-serif text-h1">Buscar</h1>
      <SearchPanel initialTerm={q ?? ''} />
    </main>
  );
}