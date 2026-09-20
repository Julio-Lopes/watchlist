'use client';

import { ApiError, apiFetch } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function OnboardingForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [focused, setFocused] = useState(false);
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
    <div className="w-full max-w-[420px]">
      <p className="kicker">o seu endereço</p>
      <h1 className="mt-5 font-mincho text-[clamp(1.75rem,3.6vw,2.5rem)] leading-[1.25] font-normal tracking-[-0.015em] text-sumi">
        Escolha seu nome de usuário
      </h1>
      <p className="mt-4.5 max-w-[34em] text-[15px] leading-[1.8] text-sumi-soft">
        Ele vai aparecer no endereço do seu perfil e não pode ser alterado depois.
      </p>

      <form onSubmit={submit} className="mt-9 flex flex-col gap-6.5 md:mt-12">
        <label className="block">
          <span className="block text-[11px] tracking-[0.2em] text-sumi-faint uppercase">
            Nome de usuário
          </span>
          <input
            required
            minLength={3}
            maxLength={30}
            pattern="[a-z0-9_]+"
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="seu_nome"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={`mt-2.5 w-full border-0 border-b bg-transparent py-2.5 text-[15.5px] font-light text-sumi transition-colors duration-400 outline-none placeholder:text-[#b0aaa3] ${
              focused ? 'border-torii' : 'border-[#d9d4cd]'
            }`}
          />
        </label>

        <p className="text-[13px] tracking-[0.02em] text-sumi-faint">
          watchlist.app/u/
          <span className="font-mincho text-[15px] text-sumi">{username || 'seu_nome'}</span>
        </p>

        <p className="-mt-2 text-xs leading-[1.75] font-light text-sumi-faint">
          De 3 a 30 caracteres: letras minúsculas, números e sublinhado.
        </p>

        {error && (
          <p role="alert" className="text-[13px] text-torii">
            {error}
          </p>
        )}

        <div className="mt-2">
          <button
            type="submit"
            disabled={busy}
            className="btn-ink cursor-pointer disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-sumi"
          >
            {busy ? 'Aguarde…' : 'Continuar'}
            <span className="block h-px w-6 bg-current" />
          </button>
        </div>
      </form>
    </div>
  );
}
