import { serverFetch } from '@/lib/api-server';
import { featuredMediaSchema } from '@watchlist/shared';

export async function LoginShowcase() {
  const featured = await serverFetch('/media/featured', featuredMediaSchema.nullable());

  return (
    <div className="relative hidden overflow-hidden border-r border-border bg-surface lg:block">
      {featured?.bannerImage && (
        <img
          src={featured.bannerImage}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-40"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-transparent" />

      <div className="relative flex h-full flex-col justify-end p-10">
        <h2 className="font-serif text-display max-w-md">Sua watchlist, levada a sério.</h2>
        <p className="mt-4 max-w-sm text-body text-fg-muted">
          Rastreie o que você assiste e veja padrões que nenhuma lista simples mostra.
        </p>

        {featured && (
          <p className="font-data mt-10 text-caption text-fg-muted">
            {featured.title}
            {featured.year ? ` · ${featured.year}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}