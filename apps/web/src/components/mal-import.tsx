'use client';

import { ApiError, apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { importStatusSchema, type ImportStatus } from '@watchlist/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

const startedSchema = z.object({ jobId: z.uuid() });

const sectionTitle =
  'font-mincho text-[clamp(19px,2.2vw,24px)] font-normal tracking-[-0.01em] text-sumi';
const solidButton =
  'cursor-pointer border border-sumi bg-sumi px-6 py-3.5 text-xs tracking-[0.12em] text-washi uppercase transition-colors duration-400 hover:border-torii hover:bg-torii disabled:cursor-default disabled:opacity-50 disabled:hover:border-sumi disabled:hover:bg-sumi';
const outlineButton =
  'inline-block cursor-pointer border border-[#d9d4cd] bg-transparent px-[22px] py-[11px] text-xs tracking-[0.12em] text-sumi uppercase transition-colors duration-400 hover:border-sumi hover:bg-sumi hover:text-washi';

/**
 * O MAL exporta .xml.gz. O navegador descomprime com DecompressionStream,
 * nativo desde 2023: assim a API nao precisa de multipart nem de zlib, e o
 * corpo vai como JSON comum.
 */
async function readExport(file: File): Promise<string> {
  const isGzip = file.name.endsWith('.gz');

  if (!isGzip) return file.text();

  const stream = file.stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

export function MalImport() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ImportStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const current = await apiFetch('/import/current', {
          schema: importStatusSchema.nullable()
        });

        if (!cancelled && current) {
          setJobId(current.jobId);
          setStatus(current);
          setBusy(current.status === 'pending' || current.status === 'running');
        }
      } catch {
        // A falha ao restaurar nao impede uma nova importacao.
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!jobId) return;

    /** Consulta de segundo em segundo. Como efeito colateral util, essas
     *  requisicoes mantem o servico acordado enquanto o job roda. */
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    async function poll() {
      try {
        const next = await apiFetch(`/import/${jobId}`, { schema: importStatusSchema });
        setStatus(next);

        if (next.status === 'done' || next.status === 'failed' || next.status === 'cancelled') {
          setBusy(false);
          if (next.status === 'done') router.refresh();
          return;
        }
      } catch {
        setBusy(false);
        return;
      }

      if (!cancelled) timer = setTimeout(() => void poll(), 1000);
    }

    timer = setTimeout(() => void poll(), 1000);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, router]);

  async function cancelImport() {
    if (!jobId) return;

    try {
      await apiFetch(`/import/${jobId}/cancel`, { method: 'POST' });
      setBusy(false);
      setJobId(null);
      setStatus((current) =>
        current
          ? { ...current, status: 'cancelled', error: 'Importação cancelada.' }
          : current
      );
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível cancelar.');
    }
  }

  async function start(file: File) {
    setBusy(true);
    setStatus(null);

    try {
      const xml = await readExport(file);

      if (!xml.includes('<myanimelist>') && !xml.includes('<anime>')) {
        throw new Error('Este arquivo não parece uma exportação do MyAnimeList.');
      }

      const started = await apiFetch('/import/mal', {
        method: 'POST',
        body: { xml, overwrite },
        schema: startedSchema
      });

      setJobId(started.jobId);
    } catch (cause) {
      toast.error(
        cause instanceof ApiError || cause instanceof Error
          ? cause.message
          : 'Não foi possível ler o arquivo.'
      );
      setBusy(false);
    }
  }

  const percent =
    status && status.total > 0 ? Math.round((status.processed / status.total) * 100) : 0;
  const importing = status?.status === 'pending' || status?.status === 'running';

  return (
    <div>
      <section className="border-t border-hairline pt-[clamp(24px,3.6vh,34px)]">
        <h2 className={sectionTitle}>Como exportar do MyAnimeList</h2>
        <ol className="mt-5 flex flex-col gap-3">
          {[
            'Entre na sua conta do MyAnimeList e abra a página de exportação.',
            'Escolha a lista de anime e clique em exportar.',
            'O site gera um arquivo .xml.gz. Baixe e envie aqui.'
          ].map((step, index) => (
            <li key={step} className="flex gap-4 text-[15px] leading-[1.8] font-light text-sumi-soft">
              <span className="w-4 shrink-0 font-mincho text-[15px] text-torii">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-5 text-xs leading-[1.75] font-light text-sumi-faint">
          Você não precisa descompactar: fazemos isso aqui no navegador.
        </p>
      </section>

      <section className="mt-[clamp(34px,5vh,52px)] border-t border-hairline pt-[clamp(24px,3.6vh,34px)]">
        <h2 className={sectionTitle}>Enviar arquivo</h2>

        <div className="mt-5 flex items-center gap-3.5">
          <button
            type="button"
            role="switch"
            aria-checked={overwrite}
            aria-label="Sobrescrever obras que já estão na minha biblioteca"
            onClick={() => setOverwrite(!overwrite)}
            disabled={busy}
            className={cn(
              'relative h-5 w-9 shrink-0 cursor-pointer border-0 p-0 transition-colors duration-400 disabled:cursor-default',
              overwrite ? 'bg-sumi' : 'bg-[#d9d4cd]'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-4 bg-washi transition-[left] duration-400',
                overwrite ? 'left-[18px]' : 'left-0.5'
              )}
            />
          </button>
          <span className="text-sm text-sumi-soft">
            Sobrescrever obras que já estão na minha biblioteca
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xml,.gz,.xml.gz"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void start(file);
            event.target.value = '';
          }}
        />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className={solidButton}
          >
            {busy ? 'Importando…' : 'Escolher arquivo'}
          </button>

          {busy && (
            <button type="button" className={outlineButton} onClick={() => void cancelImport()}>
              Cancelar importação
            </button>
          )}
        </div>

        {importing && status.total > 0 && (
          <div className="mt-6">
            <div className="h-px bg-[#d9d4cd]">
              <div
                className="h-px bg-torii transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-2.5 font-mincho text-[13px] text-sumi-soft">
              {status.processed} <span className="text-sumi-faint">de {status.total} obras</span>
            </p>
          </div>
        )}

        {status?.status === 'failed' && (
          <p className="mt-5 text-[13px] leading-[1.75] text-torii">
            A importação falhou. {status.error ?? 'Tente de novo em instantes.'}
          </p>
        )}

        {status?.status === 'cancelled' && (
          <p className="mt-5 text-[13px] leading-[1.75] text-sumi-soft">
            A importação foi cancelada em {status.processed} de {status.total} obras.
          </p>
        )}
      </section>

      {status?.result && status.status === 'done' && (
        <section className="mt-[clamp(34px,5vh,52px)] border-t border-hairline pt-[clamp(24px,3.6vh,34px)]">
          <p className="kicker">完 &nbsp;·&nbsp; concluída</p>
          <h2 className={cn(sectionTitle, 'mt-3.5')}>Importação concluída</h2>

          <div className="mt-6 flex flex-wrap gap-x-[clamp(28px,4vw,52px)] gap-y-5">
            <div>
              <p className="font-mincho text-[clamp(28px,3.4vw,38px)] leading-none text-torii">
                {status.result.imported}
              </p>
              <p className="mt-2 text-xs tracking-[0.08em] text-sumi-faint">importadas</p>
            </div>
            <div>
              <p className="font-mincho text-[clamp(28px,3.4vw,38px)] leading-none text-sumi">
                {status.result.skipped}
              </p>
              <p className="mt-2 text-xs tracking-[0.08em] text-sumi-faint">já existiam</p>
            </div>
            {status.result.failures.length > 0 && (
              <div>
                <p className="font-mincho text-[clamp(28px,3.4vw,38px)] leading-none text-sumi">
                  {status.result.failures.length}
                </p>
                <p className="mt-2 text-xs tracking-[0.08em] text-sumi-faint">não encontradas</p>
              </div>
            )}
          </div>

          {/** Falhas listadas, nao ignoradas em silencio: saber qual obra nao
           *   entrou permite adicionar a mao. */}
          {status.result.failures.length > 0 && (
            <div className="mt-8 border-t border-hairline pt-5">
              <p className="text-sm text-sumi-soft">Estas obras não puderam ser importadas:</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {status.result.failures.slice(0, 20).map((failure) => (
                  <li key={failure.malId} className="text-[13px] text-sumi">
                    {failure.title} <span className="text-sumi-faint">· {failure.reason}</span>
                  </li>
                ))}
              </ul>
              {status.result.failures.length > 20 && (
                <p className="mt-3 text-xs text-sumi-faint">
                  e mais {status.result.failures.length - 20}.
                </p>
              )}
            </div>
          )}

          <Link href="/biblioteca" className={cn(outlineButton, 'mt-8')}>
            Ver minha biblioteca
          </Link>
        </section>
      )}
    </div>
  );
}
