'use client';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { ApiError, apiFetch } from '@/lib/api-client';
import type { Settings } from '@watchlist/shared';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const title = 'font-mincho text-[clamp(20px,2.4vw,28px)] font-normal tracking-[-0.01em]';
const lead = 'mt-2.5 max-w-[38em] text-sm leading-[1.75] font-light text-sumi-soft';
const section = 'mt-[clamp(44px,7vh,76px)] scroll-mt-32 border-t pt-[clamp(28px,4vh,40px)]';
const outlineButton =
  'inline-block cursor-pointer border border-[#d9d4cd] bg-transparent px-[22px] py-[11px] text-xs tracking-[0.12em] text-sumi uppercase transition-colors duration-400 hover:border-sumi hover:bg-sumi hover:text-washi';
const dialogContent =
  'gap-0 rounded-none border-hairline bg-washi p-[clamp(24px,3vw,34px)] font-jp text-sumi shadow-none sm:max-w-[520px]';
const label = 'block text-[11px] tracking-[0.2em] text-sumi-faint uppercase';
const field =
  'mt-2.5 w-full border-0 border-b border-[#d9d4cd] bg-transparent py-2.5 text-[15.5px] font-light text-sumi transition-colors duration-400 outline-none placeholder:text-[#a8a29b] focus:border-torii';
const solid =
  'w-full cursor-pointer border border-sumi bg-sumi px-6 py-[15px] text-[12.5px] tracking-[0.12em] text-washi uppercase transition-colors duration-400 hover:border-torii hover:bg-torii disabled:cursor-default disabled:opacity-50 disabled:hover:border-sumi disabled:hover:bg-sumi';

function DialogTop({ children }: { children: React.ReactNode }) {
  return (
    <DialogHeader className="flex-row items-baseline gap-4 border-b border-hairline pb-[18px] text-left">
      <DialogTitle className="font-mincho text-[22px] leading-normal font-normal tracking-[-0.01em]">
        {children}
      </DialogTitle>
      <DialogClose
        aria-label="Fechar"
        className="ml-auto flex cursor-pointer border-0 bg-transparent p-1 text-sumi-soft transition-colors duration-400 hover:text-sumi"
      >
        <X className="size-4" strokeWidth={1.2} aria-hidden />
      </DialogClose>
    </DialogHeader>
  );
}

export function SettingsAccount({ settings }: { settings: Settings }) {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  async function changePassword() {
    setBusy(true);

    try {
      await apiFetch('/me/password', {
        method: 'PATCH',
        body: { currentPassword, newPassword }
      });
      setPasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Senha alterada. As outras sessões foram encerradas.');
      router.refresh();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível alterar.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setBusy(true);

    try {
      await apiFetch('/me', { method: 'DELETE', body: { confirmation } });
      router.push('/');
      router.refresh();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível excluir.');
      setBusy(false);
    }
  }

  return (
    <>
      <section id="conta" className={`${section} border-hairline`}>
        <h2 className={`${title} text-sumi`}>Conta</h2>
        <p className={lead}>E-mail e senha.</p>

        <div className="mt-6 border-b border-hairline pb-5">
          <p className="text-sm text-sumi">{settings.email}</p>
          <p className="mt-1.5 text-xs tracking-[0.06em]">
            {settings.emailVerified ? (
              <span className="text-sumi-faint">verificado</span>
            ) : (
              <span className="text-torii">não verificado</span>
            )}
          </p>
        </div>

        <div className="mt-5 flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-sumi">Senha</p>
            <p className="mt-1.5 max-w-[38em] text-xs leading-[1.75] font-light text-sumi-faint">
              {settings.hasPassword
                ? 'Trocar encerra as sessões nos outros dispositivos.'
                : 'Sua conta entra pelo Google e não tem senha.'}
            </p>
          </div>

          {settings.hasPassword && (
            <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
              <DialogTrigger asChild>
                <button type="button" className={`${outlineButton} shrink-0 px-[18px] py-2.5`}>
                  Alterar
                </button>
              </DialogTrigger>
              <DialogContent showCloseButton={false} className={dialogContent}>
                <DialogTop>Alterar senha</DialogTop>

                <div className="mt-6 flex flex-col gap-[26px]">
                  <label className="block">
                    <span className={label}>Senha atual</span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className={field}
                    />
                  </label>
                  <label className="block">
                    <span className={label}>Nova senha</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={10}
                      placeholder="Mínimo de 10 caracteres"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className={field}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void changePassword()}
                    disabled={busy || newPassword.length < 10}
                    className={solid}
                  >
                    {busy ? 'Alterando…' : 'Alterar senha'}
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </section>

      <section id="dados" className={`${section} border-hairline`}>
        <h2 className={`${title} text-sumi`}>Seus dados</h2>
        <p className={lead}>Leve tudo com você a qualquer momento. Nada aqui fica preso.</p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          {[
            { href: '/api/export/json', label: 'Exportar tudo (JSON)' },
            { href: '/api/export/csv', label: 'Biblioteca (CSV)' },
            { href: '/api/export/letterboxd', label: 'Filmes para Letterboxd' }
          ].map((option) => (
            <a key={option.href} href={option.href} download className={outlineButton}>
              {option.label}
            </a>
          ))}
        </div>
      </section>

      <section id="excluir" className={`${section} border-torii/40`}>
        <h2 className={`${title} text-torii`}>Excluir conta</h2>
        <p className={lead}>
          Apaga seu histórico, reviews, coleções e tudo mais. Não dá para desfazer.
        </p>

        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="mt-6 cursor-pointer border border-torii/50 bg-transparent px-[22px] py-[11px] text-xs tracking-[0.12em] text-torii uppercase transition-colors duration-400 hover:border-torii hover:bg-torii hover:text-washi"
            >
              Excluir conta
            </button>
          </DialogTrigger>

          <DialogContent showCloseButton={false} className={dialogContent}>
            <DialogTop>Excluir sua conta</DialogTop>

            <div className="mt-6 flex flex-col gap-[26px]">
              <p className="text-[13.5px] leading-[1.8] text-sumi-soft">
                Isso apaga tudo em definitivo e não pode ser desfeito. Para confirmar, digite{' '}
                <span className="font-mincho text-sumi">{settings.username}</span> abaixo.
              </p>

              {/** Digitar o proprio username e a barreira: botao sozinho ja foi
               *   clicado por engano em todo produto que existe. */}
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={settings.username}
                autoComplete="off"
                className={`${field} mt-0`}
              />

              <button
                type="button"
                onClick={() => void deleteAccount()}
                disabled={busy || confirmation !== settings.username}
                className="w-full cursor-pointer border border-torii bg-torii px-6 py-[15px] text-[12.5px] tracking-[0.12em] text-washi uppercase transition-opacity duration-400 hover:opacity-85 disabled:cursor-default disabled:opacity-40"
              >
                {busy ? 'Excluindo…' : 'Excluir minha conta'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </>
  );
}
