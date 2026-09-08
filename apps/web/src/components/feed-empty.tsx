import { Users } from '@/lib/icons';
import type { SuggestedUser } from '@watchlist/shared';
import Link from 'next/link';

export function FeedEmpty({ suggestions }: { suggestions: SuggestedUser[] }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-8">
      <Users className="size-6 text-accent" aria-hidden />
      <h2 className="mt-3 font-serif text-h2">Seu feed está esperando</h2>
      <p className="mt-2 max-w-md text-body text-fg-muted">
        Siga outras pessoas para ver o que elas estão assistindo e o que andaram escrevendo.
      </p>

      {suggestions.length > 0 && (
        <div className="mt-6">
          <p className="text-caption tracking-wide text-fg-muted uppercase">Para começar</p>
          <div className="mt-3 space-y-1">
            {suggestions.map((user) => (
              <Link
                key={user.username}
                href={`/u/${user.username}`}
                className="flex items-center gap-3 rounded-[var(--radius-control)] p-2 transition-colors duration-150 hover:bg-surface-hover"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="size-8 rounded-full" />
                ) : (
                  <span className="size-8 rounded-full bg-surface-hover" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-small">{user.displayName ?? user.username}</p>
                  <p className="text-caption text-fg-muted">@{user.username}</p>
                </div>

                <span className="font-data text-caption text-fg-muted">
                  {user.entriesCount} obras
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}