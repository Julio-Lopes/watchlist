import { BadgeGrid } from '@/components/badge-grid';
import { serverFetch } from '@/lib/api-server';
import { badgeListSchema } from '@watchlist/shared';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Badges · Watchlist' };

export default async function BadgesPage() {
  const data = await serverFetch('/me/badges', badgeListSchema);

  if (!data) {
    return (
      <div className="mx-auto max-w-[1080px]">
        <h1 className="border-b border-hairline pb-4 font-mincho text-[clamp(24px,3vw,34px)] font-normal tracking-[-0.015em] text-sumi">
          Badges
        </h1>
        <p className="mt-[clamp(26px,4vh,40px)] font-mincho text-[clamp(20px,2.4vw,26px)] text-sumi">
          Não foi possível carregar suas badges
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1080px]">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-3 pb-[clamp(22px,3vh,30px)]">
        <h1 className="font-mincho text-[clamp(24px,3vw,34px)] font-normal tracking-[-0.015em] text-sumi">
          Badges
        </h1>
        <span className="font-mincho text-sm text-sumi-faint">
          {data.earned} de {data.total}
        </span>
      </div>

      <BadgeGrid items={data.items} />
    </div>
  );
}
