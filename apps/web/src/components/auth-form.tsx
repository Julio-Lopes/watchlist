'use client';

import { ApiError, apiFetch } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

type Mode = 'login' | 'register' | 'forgot';

const COPY: Record<Mode, { kicker: string; title: string; lead: string; submit: string }> = {
  login: {
    kicker: 'de volta',
    title: 'Continue de onde parou.',
    lead: 'Seu registro continua exatamente como você deixou — nenhum episódio se perdeu.',
    submit: 'Entrar'
  },
  register: {
    kicker: 'o começo',
    title: 'Comece uma página em branco.',
    lead: 'Só o necessário: um nome para chamar você e um endereço para guardar a chave.',
    submit: 'Criar conta'
  },
  forgot: {
    kicker: 'a chave reserva',
    title: 'Vamos recuperar o acesso.',
    lead: 'Informe seu e-mail: enviamos um link válido por 1 hora para trocar a senha.',
    submit: 'Enviar link'
  }
};

/** Campo de texto: label em caixa alta espaçada, input sem caixa, hairline
 *  inferior que assume o torii no foco. */
function Field({
  label,
  type = 'text',
  name,
  placeholder,
  autoComplete,
  required,
  minLength,
  value,
  onChange,
  action,
  children
}: {
  label: string;
  type?: string;
  name: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  value: string;
  onChange: (value: string) => void;
  action?: ReactNode;
  children?: ReactNode;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <label className="block">
      <span className="flex items-baseline gap-3.5 text-[11px] tracking-[0.2em] text-sumi-faint uppercase">
        {label}
        {action}
      </span>
      <span className="relative block">
        <input
          type={type}
          name={name}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`mt-2.5 w-full border-0 border-b bg-transparent py-2.5 text-[15.5px] font-light text-sumi transition-colors duration-400 outline-none placeholder:text-[#b0aaa3] ${
            focused ? 'border-torii' : 'border-[#d9d4cd]'
          } ${children ? 'pr-16' : ''}`}
        />
        {children}
      </span>
    </label>
  );
}

export function AuthForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? '');

  const copy = COPY[mode];

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
  }

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
        switchMode('login');
        return;
      }

      const body =
        mode === 'register'
          ? { email, password, displayName: displayName.trim() || undefined }
          : { email, password };
      await apiFetch(`/auth/${mode}`, { method: 'POST', body });

      /** Padrão único de mutação desta aplicação: chamada direta com cookie,
       *  depois router.refresh() para o servidor reavaliar a sessão. */
      router.push('/inicio');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Algo deu errado. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-w-0 flex-[1_1_min(100%,520px)] flex-col px-6 pt-6 pb-8 sm:px-12 lg:px-18">
      <div className="flex items-center gap-4.5">
        <Link href="/" className="font-mincho text-[18px] font-medium tracking-[0.02em] text-sumi">
          Watchlist
        </Link>
        <Link
          href="/"
          className="ml-auto text-xs tracking-[0.08em] text-sumi-faint transition-colors duration-400 hover:text-sumi"
        >
          ← voltar ao início
        </Link>
      </div>

      <div className="flex flex-1 items-center py-12 md:py-20">
        <div className="w-full max-w-[420px]">
          {mode !== 'forgot' && (
            <div className="mb-10 flex gap-7 border-b border-hairline md:mb-14">
              {(
                [
                  ['login', 'Entrar'],
                  ['register', 'Criar conta']
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchMode(key)}
                  className={`-mb-px cursor-pointer border-0 border-b bg-transparent pb-3 text-[13px] tracking-[0.12em] uppercase transition-colors duration-400 ${
                    mode === key
                      ? 'border-sumi text-sumi'
                      : 'border-transparent text-sumi-faint hover:text-sumi'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <p className="kicker">{copy.kicker}</p>
          <h1 className="mt-5 font-mincho text-[clamp(1.75rem,3.6vw,2.5rem)] leading-[1.25] font-normal tracking-[-0.015em] text-sumi">
            {copy.title}
          </h1>
          <p className="mt-4.5 max-w-[34em] text-[15px] leading-[1.8] text-sumi-soft">{copy.lead}</p>

          {mode !== 'forgot' && process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true' && (
            <>
              <a
                href="/api/auth/google"
                className="btn-ink mt-9 w-full justify-center bg-transparent md:mt-12"
              >
                Continuar com Google
              </a>

              <div className="mt-6 flex items-center gap-4.5">
                <span className="hairline flex-1" />
                <span className="text-[11px] tracking-[0.2em] text-sumi-faint uppercase">ou</span>
                <span className="hairline flex-1" />
              </div>
            </>
          )}

          <form onSubmit={submit} className="mt-9 flex flex-col gap-6.5 md:mt-12">
            {mode === 'register' && (
              <Field
                label="Nome"
                name="displayName"
                autoComplete="name"
                placeholder="como quer ser chamado"
                value={displayName}
                onChange={setDisplayName}
              />
            )}

            <Field
              label="E-mail"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              required
              value={email}
              onChange={setEmail}
            />

            {mode !== 'forgot' && (
              <Field
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                placeholder={mode === 'register' ? 'Mínimo de 10 caracteres' : 'Sua senha'}
                required
                minLength={mode === 'register' ? 10 : undefined}
                value={password}
                onChange={setPassword}
                action={
                  mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="ml-auto text-[11px] tracking-[0.08em] normal-case text-sumi-faint transition-colors duration-400 hover:text-torii"
                    >
                      esqueci
                    </button>
                  )
                }
              >
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 bottom-3 cursor-pointer border-0 bg-transparent p-0 text-[11px] tracking-[0.1em] text-sumi-faint uppercase transition-colors duration-400 hover:text-sumi"
                >
                  {showPassword ? 'ocultar' : 'mostrar'}
                </button>
              </Field>
            )}

            {error && (
              <p role="alert" className="text-[13px] text-torii">
                {error}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-4">
              <button type="submit" disabled={busy} className="btn-ink cursor-pointer bg-transparent">
                {busy ? 'Enviando…' : copy.submit}
                <span className="block h-px w-6 bg-current" />
              </button>

              {mode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs tracking-[0.04em] text-sumi-faint transition-colors duration-400 hover:text-sumi"
                >
                  Voltar para o login
                </button>
              )}
            </div>
          </form>

          <p className="mt-10 max-w-[36em] text-xs leading-[1.85] text-sumi-faint md:mt-12">
            Ao continuar você concorda com os{' '}
            <Link href="/termos" className="border-b border-[#d9d4cd] pb-px text-sumi-faint">
              termos
            </Link>{' '}
            e a{' '}
            <Link href="/privacidade" className="border-b border-[#d9d4cd] pb-px text-sumi-faint">
              política de privacidade
            </Link>
            . Não enviamos e-mail além do necessário.
          </p>
        </div>
      </div>
    </main>
  );
}
