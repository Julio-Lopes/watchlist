import type { SuggestedUser } from '@watchlist/shared';
import Link from 'next/link';

export function FeedEmpty({ suggestions }: { suggestions: SuggestedUser[] }) {
  return (
    <section className="mt-[clamp(30px,5vh,46px)] border-t border-hairline pt-[clamp(30px,5vh,44px)]">
      <p className="kicker">&nbsp;·&nbsp; ainda vazio</p>
      <h2 className="mt-[18px] font-mincho text-[clamp(24px,2.8vw,32px)] leading-[1.3] font-normal tracking-[-0.01em] text-sumi">
        Seu feed está esperando
      </h2>
      <p className="mt-4 max-w-[34em] text-[15px] leading-[1.85] font-light text-sumi-soft">
        Siga outras pessoas para ver o que elas estão assistindo e o que andaram escrevendo.
      </p>

      {suggestions.length > 0 && (
        <div className="mt-[clamp(34px,5vh,50px)]">
          <p className="text-[11px] tracking-[0.2em] text-sumi-faint uppercase">Para começar</p>
          <div className="mt-[18px] border-t border-hairline">
            {suggestions.map((user) => (
              <Link
                key={user.username}
                href={`/u/${user.username}`}
                className="flex items-center gap-4 border-b border-hairline px-1 py-4 transition-colors duration-400 hover:bg-washi-2"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#d9d4cd] font-mincho text-[13px] text-sumi-faint">
                    {(user.displayName ?? user.username)[0]?.toUpperCase()}
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] text-sumi">
                    {user.displayName ?? user.username}
                  </span>
                  <span className="mt-[3px] block text-xs tracking-[0.03em] text-sumi-faint">
                    @{user.username}
                  </span>
                </span>

                <span className="shrink-0 font-mincho text-sm text-sumi-soft">
                  {user.entriesCount} obras
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
