'use client';

import { Button } from '@/components/ui/button';
import { ApiError, apiFetch } from '@/lib/api-client';
import { CircleCheck, Loader2, TriangleAlert } from '@/lib/icons';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function Verify() {
  const token = useSearchParams().get('token');
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Link inválido.');
      return;
    }

    apiFetch('/auth/email/verify', { method: 'POST', body: { token } })
      .then(() => setState('ok'))
      .catch((cause: unknown) => {
        setState('error');
        setMessage(cause instanceof ApiError ? cause.message : 'Não foi possível verificar.');
      });
  }, [token]);

  if (state === 'loading') {
    return <Loader2 className="size-6 animate-spin text-fg-muted" aria-label="Verificando" />;
  }

  return (
    <div className="max-w-sm space-y-4 text-center">
      {state === 'ok' ? (
        <>
          <CircleCheck className="mx-auto size-6 text-success" aria-hidden />
          <h1 className="font-serif text-h2">E-mail confirmado</h1>
        </>
      ) : (
        <>
          <TriangleAlert className="mx-auto size-6 text-warning" aria-hidden />
          <h1 className="font-serif text-h2">Link inválido</h1>
          <p className="text-small text-fg-muted">{message}</p>
        </>
      )}
      <Button asChild>
        <Link href="/inicio">Ir para o início</Link>
      </Button>
    </div>
  );
}

export default function VerificarPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Suspense fallback={null}>
        <Verify />
      </Suspense>
    </main>
  );
}