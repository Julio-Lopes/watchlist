'use client';

import { apiFetch } from '@/lib/api-client';
import { recommendationsSchema, type MediaSummary } from '@watchlist/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Props {
  source: string;
  mediaType: string;
  externalId: number;
}

export function Recommendations({ source, mediaType, externalId }: Props) {
  const [items, setItems] = useState<MediaSummary[] | null>(null);

  useEffect(() => {
    /** Carrega depois da pagina renderizar: a chamada bate na fonte externa e
     *  nao pode atrasar o primeiro render nem furar o TTL do detalhe. */
    const controller = new AbortController();

    apiFetch(`/media/${source}/${mediaType}/${externalId}/recommendations`, {
      schema: recommendationsSchema,
      signal: controller.signal
    })
      .then((page) => setItems(page.items))
      .catch(() => setItems([]));

    return () => controller.abort();
  }, [source, mediaType, externalId]);

  /** Enquanto carrega, nada: um esqueleto aqui competiria com as reviews,
   *  que sao o conteudo principal abaixo do detalhe. */
  if (items === null || items.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-serif text-h2">Quem gostou disso também viu</h2>

      <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => (
          <Link
            key={`${item.source}-${item.externalId}`}
            href={`/media/${item.source}/${item.mediaType}/${item.externalId}`}
            className="group"
          >
            <div className="aspect-2/3 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface transition-colors duration-150 group-hover:border-fg-muted">
              {item.coverImage && (
                <img
                  src={item.coverImage}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              )}
            </div>

            <p className="mt-1.5 truncate text-caption">{item.title}</p>
            {item.avgScore !== null && (
              <p className="font-data text-caption text-fg-muted">
                {(item.avgScore / 10).toFixed(1).replace('.', ',')}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}