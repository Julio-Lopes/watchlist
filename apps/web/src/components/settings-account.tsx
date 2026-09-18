'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiError, apiFetch } from '@/lib/api-client';
import type { Settings } from '@watchlist/shared';
import { Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

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
      <section
        id="conta"
        className="scroll-mt-28 rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6"
      >
        <h2 className="text-h3">Conta</h2>
        <p className="mt-0.5 text-small text-fg-muted">E-mail e senha.</p>

        <div className="mt-4 border-b border-border pb-4">
          <p className="text-small">{settings.email}</p>
          <p className="mt-0.5 text-caption">
            {settings.emailVerified ? (
              <span className="text-success">verificado</span>
            ) : (
              <span className="text-warning">não verificado</span>
            )}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="max-w-md">
            <p className="text-small">Senha</p>
            <p className="mt-0.5 text-caption text-fg-muted">
              {settings.hasPassword
                ? 'Trocar encerra as sessões nos outros dispositivos.'
                : 'Sua conta entra pelo Google e não tem senha.'}
            </p>
          </div>

          {settings.hasPassword && (
            <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Alterar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif text-h3">Alterar senha</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Senha atual"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                  <Input
                    type="password"
                    autoComplete="new-password"
                    minLength={10}
                    placeholder="Nova senha, mínimo de 10 caracteres"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  <Button
                    onClick={() => void changePassword()}
                    disabled={busy || newPassword.length < 10}
                    className="w-full"
                  >
                    {busy ? 'Alterando...' : 'Alterar senha'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </section>

      <section
        id="dados"
        className="scroll-mt-28 rounded-[var(--radius-card)] border border-border bg-surface p-4 md:p-6"
      >
        <h2 className="text-h3">Seus dados</h2>
        <p className="mt-0.5 max-w-lg text-small text-fg-muted">
          Leve tudo com você a qualquer momento. Nada aqui fica preso.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { href: '/api/export/json', label: 'Exportar tudo (JSON)' },
            { href: '/api/export/csv', label: 'Biblioteca (CSV)' },
            { href: '/api/export/letterboxd', label: 'Filmes para Letterboxd' }
          ].map((option) => (
            <Button key={option.href} asChild variant="outline" size="sm">
              <a href={option.href} download>
                <Download className="size-4" aria-hidden />
                {option.label}
              </a>
            </Button>
          ))}
        </div>
      </section>

      <section
        id="excluir"
        className="scroll-mt-28 rounded-[var(--radius-card)] border border-danger/30 p-4 md:p-6"
      >
        <h2 className="text-h3 text-danger">Excluir conta</h2>
        <p className="mt-1 max-w-lg text-small text-fg-muted">
          Apaga seu histórico, reviews, coleções e tudo mais. Não dá para desfazer.
        </p>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="mt-4 border-danger/40 text-danger">
              Excluir conta
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-h3">Excluir sua conta</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-small text-fg-muted">
                Isso apaga tudo em definitivo e não pode ser desfeito. Para confirmar, digite{' '}
                <span className="font-data text-fg">{settings.username}</span> abaixo.
              </p>

              {/** Digitar o proprio username e a barreira: botao sozinho ja foi
               *   clicado por engano em todo produto que existe. */}
              <Input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={settings.username}
                autoComplete="off"
              />

              <Button
                onClick={() => void deleteAccount()}
                disabled={busy || confirmation !== settings.username}
                className="w-full bg-danger hover:bg-danger/90"
              >
                {busy ? 'Excluindo...' : 'Excluir minha conta'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </>
  );
}