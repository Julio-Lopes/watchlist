'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export function WrappedShare({ username, year }: { username: string; year: number }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const url = typeof window === 'undefined' ? '' : window.location.href;
  const image = `/api/og/wrapped?username=${username}&year=${year}`;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar.');
    }
  }

  return (
    <section className="mt-[clamp(44px,7vh,76px)] border-t border-hairline pt-[clamp(26px,4vh,38px)]">
      <div className="flex flex-wrap items-start gap-[clamp(24px,4vw,52px)]">
        <div className="min-w-0 flex-[1_1_300px]">
          <h2 className="font-mincho text-[clamp(20px,2.4vw,28px)] font-normal tracking-[-0.01em] text-sumi">
            Compartilhar
          </h2>
          <p className="mt-2.5 max-w-[34em] text-sm leading-[1.75] font-light text-sumi-soft">
            A imagem é gerada com esses números e serve como prévia no WhatsApp, no Twitter e no
            Discord.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {/** download força o salvamento em vez de abrir a imagem na aba. */}
            <a
              href={image}
              download={`watchlist-${username}-${year}.png`}
              className="inline-block cursor-pointer border border-sumi bg-sumi px-6 py-3.5 text-xs tracking-[0.12em] text-washi uppercase transition-colors duration-400 hover:border-torii hover:bg-torii"
            >
              Baixar imagem
            </a>

            <button
              type="button"
              onClick={() => void copy()}
              className="cursor-pointer border border-[#d9d4cd] bg-transparent px-6 py-3.5 text-xs tracking-[0.12em] text-sumi uppercase transition-colors duration-400 hover:border-sumi hover:bg-sumi hover:text-washi"
            >
              {copied ? 'Copiado' : 'Copiar link'}
            </button>
          </div>
        </div>

        {/** A prévia é o próprio arquivo que será baixado. */}
        <a
          href={image}
          download={`watchlist-${username}-${year}.png`}
          aria-label="Baixar imagem"
          className="block w-full max-w-[260px] shrink-0 border border-hairline bg-washi-2"
        >
          <img
            src={image}
            alt="Prévia da imagem do Wrapped"
            loading="lazy"
            className="block aspect-[1080/1350] w-full object-cover"
          />
        </a>
      </div>
    </section>
  );
}
