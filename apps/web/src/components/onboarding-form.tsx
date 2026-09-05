'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, apiFetch } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function OnboardingForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await apiFetch('/auth/username', { method: 'POST', body: { username } });
      router.push('/inicio');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4">
      <div className="space-y-2">
        <h1 className="font-serif text-h1">Escolha seu nome de usuário</h1>
        <p className="text-small text-fg-muted">
          Ele vai aparecer no endereço do seu perfil e não pode ser alterado depois.
        </p>
      </div>

      <Input
        required
        minLength={3}
        maxLength={30}
        pattern="[a-z0-9_]+"
        placeholder="seu_nome"
        value={username}
        onChange={(event) => setUsername(event.target.value.toLowerCase())}
      />

      <p className="font-data text-caption text-fg-muted">watchlist.app/u/{username || 'seu_nome'}</p>

      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? 'Aguarde...' : 'Continuar'}
      </Button>
    </form>
  );
}