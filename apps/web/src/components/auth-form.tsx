'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, apiFetch } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

type Mode = 'login' | 'register' | 'forgot';

const TITLES: Record<Mode, string> = {
  login: 'Entrar',
  register: 'Criar conta',
  forgot: 'Recuperar senha'
};

export function AuthForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? '');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      if (mode === 'forgot') {
        const result = await apiFetch<never>('/auth/password/forgot', {
          method: 'POST',
          body: { email }
        });
        toast.success((result as { message: string }).message);
        setMode('login');
        return;
      }

      await apiFetch(`/auth/${mode}`, { method: 'POST', body: { email, password } });

      /** Padrao unico de mutacao desta aplicacao: chamada direta com cookie,
       *  depois router.refresh() para o servidor reavaliar a sessao. */
      router.push('/inicio');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Algo deu errado. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2">
        <h1 className="font-serif text-h1">{TITLES[mode]}</h1>
        {mode === 'forgot' && (
          <p className="text-small text-fg-muted">
            Enviamos um link válido por 1 hora para o seu e-mail.
          </p>
        )}
      </div>

      <Button variant="outline" className="w-full" asChild>
        <a href="/api/auth/google">Continuar com Google</a>
      </Button>

      <div className="flex items-center gap-3 text-caption text-fg-muted">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Input
          type="email"
          required
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        {mode !== 'forgot' && (
          <Input
            type="password"
            required
            minLength={mode === 'register' ? 10 : undefined}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            placeholder={mode === 'register' ? 'Mínimo de 10 caracteres' : 'Sua senha'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}

        {error && (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Aguarde...' : TITLES[mode]}
        </Button>
      </form>

      <div className="flex flex-col gap-2 text-small text-fg-muted">
        {mode === 'login' && (
          <>
            <button type="button" className="text-left hover:text-fg" onClick={() => setMode('register')}>
              Não tem conta? Criar uma
            </button>
            <button type="button" className="text-left hover:text-fg" onClick={() => setMode('forgot')}>
              Esqueci minha senha
            </button>
          </>
        )}
        {mode !== 'login' && (
          <button type="button" className="text-left hover:text-fg" onClick={() => setMode('login')}>
            Voltar para o login
          </button>
        )}
      </div>
    </div>
  );
}