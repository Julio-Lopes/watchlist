import { BadgeGrid } from '@/components/badge-grid';
import { serverFetch } from '@/lib/api-server';
import { badgeListSchema } from '@watchlist/shared';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Badges · Watchlist' };

export default async function BadgesPage() {
  const data = await serverFetch('/me/badges', badgeListSchema);

  if (!data) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
        <p className="text-body">Não foi possível carregar suas badges</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-h2">Badges</h1>
        <span className="font-data text-caption text-fg-muted">
          {data.earned} de {data.total}
        </span>
      </div>

      <BadgeGrid items={data.items} />
    </div>
  );
}