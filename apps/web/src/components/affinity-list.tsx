import type { Affinity } from '@watchlist/shared';

interface Props {
  title: string;
  items: Affinity[];
  emptyHint?: string;
}

export function AffinityList({ title, items, emptyHint }: Props) {
  return (
    <section>
      <h2 className="font-mincho text-[clamp(18px,2vw,22px)] font-normal text-sumi">{title}</h2>

      {items.length === 0 ? (
        <p className="mt-3 text-[13.5px] leading-[1.8] font-light text-sumi-faint">
          {emptyHint ?? 'Ainda sem dados suficientes.'}
        </p>
      ) : (
        <div className="mt-4 border-t border-hairline">
          {items.map((item) => (
            <div key={item.name} className="flex items-center gap-3 border-b border-hairline py-2.5">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" loading="lazy" className="size-8 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#d9d4cd] font-mincho text-[13px] text-sumi-faint">
                  {item.name[0]?.toUpperCase()}
                </span>
              )}

              <span className="min-w-0 flex-1 truncate text-sm text-sumi">{item.name}</span>

              <span className="shrink-0 text-xs text-sumi-faint">{item.count} obras</span>
              <span className="w-8 shrink-0 text-right font-mincho text-sm text-sumi">
                {(item.averageRating / 10).toFixed(1).replace('.', ',')}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
