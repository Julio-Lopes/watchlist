'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, apiFetch } from '@/lib/api-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';

function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await apiFetch('/auth/password/reset', { method: 'POST', body: { token, password } });
      /** O reset encerra todas as sessoes, inclusive a atual. Voltar para o
       *  login e o comportamento correto, nao um efeito colateral. */
      toast.success('Senha alterada. Entre com a nova senha.');
      router.push('/entrar');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Não foi possível redefinir.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4">
      <h1 className="font-serif text-h1">Nova senha</h1>
      <Input
        type="password"
        required
        minLength={10}
        autoComplete="new-password"
        placeholder="Mínimo de 10 caracteres"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? 'Aguarde...' : 'Redefinir senha'}
      </Button>
    </form>
  );
}

export default function RedefinirPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </main>
  );
}