'use client';

import { Button } from '@/components/ui/button';
import { ApiError, apiFetch } from '@/lib/api-client';
import { CircleCheck, Upload } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { importStatusSchema, type ImportStatus } from '@watchlist/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

const startedSchema = z.object({ jobId: z.uuid() });

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
    <div className="space-y-6">
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6">
        <h2 className="text-h3">Como exportar do MyAnimeList</h2>
        <ol className="mt-3 space-y-2 text-small text-fg-muted">
          <li>1. Entre na sua conta do MyAnimeList e abra a página de exportação.</li>
          <li>2. Escolha a lista de anime e clique em exportar.</li>
          <li>3. O site gera um arquivo .xml.gz. Baixe e envie aqui.</li>
        </ol>
        <p className="mt-3 text-caption text-fg-muted">
          Você não precisa descompactar: fazemos isso aqui no navegador.
        </p>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6">
        <h2 className="text-h3">Enviar arquivo</h2>

        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-small text-fg-muted">
          <button
            type="button"
            role="switch"
            aria-checked={overwrite}
            onClick={() => setOverwrite(!overwrite)}
            disabled={busy}
            className={cn(
              'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150',
              overwrite ? 'bg-accent' : 'bg-border'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-4 rounded-full bg-fg transition-[left] duration-150',
                overwrite ? 'left-[18px]' : 'left-0.5'
              )}
            />
          </button>
          Sobrescrever obras que já estão na minha biblioteca
        </label>

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

        <Button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-4"
        >
          <Upload className="size-4" aria-hidden />
          {busy ? 'Importando...' : 'Escolher arquivo'}
        </Button>

        {importing && status.total > 0 && (
          <div className="mt-5">
            <div className="h-1.5 rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="font-data mt-2 text-caption text-fg-muted">
              {status.processed} de {status.total} obras
            </p>
          </div>
        )}

        {busy && (
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void cancelImport()}>
            Cancelar importação
          </Button>
        )}

        {status?.status === 'failed' && (
          <p className="mt-4 text-small text-danger">
            A importação falhou. {status.error ?? 'Tente de novo em instantes.'}
          </p>
        )}

        {status?.status === 'cancelled' && (
          <p className="mt-4 text-small text-fg-muted">
            A importação foi cancelada em {status.processed} de {status.total} obras.
          </p>
        )}
      </section>

      {status?.result && status.status === 'done' && (
        <section className="rounded-[var(--radius-card)] border border-accent/40 bg-surface p-4 md:p-6">
          <div className="flex items-center gap-2">
            <CircleCheck className="size-5 text-success" aria-hidden />
            <h2 className="text-h3">Importação concluída</h2>
          </div>

          <div className="mt-4 flex flex-wrap gap-6">
            <div>
              <p className="font-data text-h2 text-accent">{status.result.imported}</p>
              <p className="text-caption text-fg-muted">importadas</p>
            </div>
            <div>
              <p className="font-data text-h2">{status.result.skipped}</p>
              <p className="text-caption text-fg-muted">já existiam</p>
            </div>
            {status.result.failures.length > 0 && (
              <div>
                <p className="font-data text-h2 text-warning">{status.result.failures.length}</p>
                <p className="text-caption text-fg-muted">não encontradas</p>
              </div>
            )}
          </div>

          {/** Falhas listadas, nao ignoradas em silencio: saber qual obra nao
           *   entrou permite adicionar a mao. */}
          {status.result.failures.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-small text-fg-muted">Estas obras não puderam ser importadas:</p>
              <ul className="mt-2 space-y-1">
                {status.result.failures.slice(0, 20).map((failure) => (
                  <li key={failure.malId} className="text-caption text-fg-muted">
                    {failure.title} <span className="text-border text-gray-500">· {failure.reason}</span>
                  </li>
                ))}
              </ul>
              {status.result.failures.length > 20 && (
                <p className="mt-2 text-caption text-border text-gray-500">
                  e mais {status.result.failures.length - 20}.
                </p>
              )}
            </div>
          )}

          <Button asChild variant="outline" className="mt-5">
            <a href="/biblioteca">Ver minha biblioteca</a>
          </Button>
        </section>
      )}
    </div>
  );
}