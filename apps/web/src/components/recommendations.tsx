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
    <section className="mt-[clamp(48px,8vh,88px)] border-t border-hairline pt-[clamp(26px,4vh,38px)]">
      <h2 className="font-mincho text-[clamp(20px,2.4vw,28px)] font-normal tracking-[-0.01em] text-sumi">
        Quem gostou disso também viu
      </h2>

      <div className="mt-[clamp(22px,3vh,32px)] grid grid-cols-[repeat(auto-fill,minmax(min(33%,118px),1fr))] gap-x-[clamp(14px,1.8vw,20px)] gap-y-[clamp(18px,2.4vw,28px)]">
        {items.map((item) => (
          <Link
            key={`${item.source}-${item.externalId}`}
            href={`/media/${item.source}/${item.mediaType}/${item.externalId}`}
            className="block"
          >
            <span className="block aspect-2/3 overflow-hidden bg-[#eae6e0]">
              {item.coverImage && (
                <img
                  src={item.coverImage}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              )}
            </span>

            <span className="mt-2.5 block truncate text-[13px] text-sumi">{item.title}</span>
            {item.avgScore !== null && (
              <span className="mt-1 block font-mincho text-[13px] text-sumi-soft">
                {(item.avgScore / 10).toFixed(1).replace('.', ',')}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
