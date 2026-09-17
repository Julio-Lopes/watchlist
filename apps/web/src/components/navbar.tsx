'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { apiFetch } from '@/lib/api-client';
import { Flame, LogOut, Search, Settings, Trophy, Upload, User } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { Viewer } from '@watchlist/shared';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/biblioteca', label: 'Biblioteca' },
  { href: '/diario', label: 'Diário' },
  { href: '/calendario', label: 'Calendário' },
  { href: '/estatisticas', label: 'Estatísticas' },
  { href: '/ranking', label: 'Ranking' },
  { href: '/colecoes', label: 'Coleções' },
];

interface Props {
  viewer: Viewer;
  onOpenPalette: () => void;
  /** Calculado na Etapa 10. Ate la vem null e o indicador nao aparece:
   *  numero inventado na navbar mina a confianca no resto dos dados. */
  streak?: number | null;
}

export function Navbar({ viewer, onOpenPalette, streak = null }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex h-12 max-w-[1280px] items-center px-4 md:px-6 lg:px-8">
          <Link href="/inicio" className="font-serif text-h3">
            Watchlist
          </Link>

          <div className="ml-auto flex items-center gap-4">
            <button
              type="button"
              onClick={onOpenPalette}
              aria-label="Buscar"
              className="text-fg-muted transition-colors duration-150 hover:text-fg"
            >
              <Search className="size-5" aria-hidden />
            </button>

            {streak !== null && streak > 0 && (
              <span
                className="font-data flex items-center gap-1 text-small text-accent"
                title="Sequência atual"
              >
                <Flame className="size-4" aria-hidden />
                {streak}
              </span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu da conta">
                  {viewer.avatarUrl ? (
                    <img src={viewer.avatarUrl} alt="" className="size-7 rounded-full" />
                  ) : (
                    <User className="size-5" aria-hidden />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/u/${viewer.username}`}>
                    <User className="size-4" aria-hidden />
                    Meu perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/config">
                    <Settings className="size-4" aria-hidden />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/badges">
                    <Trophy className="size-4" aria-hidden />
                    Badges
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/importar">
                    <Upload className="size-4" aria-hidden />
                    Importar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void logout()}>
                  <LogOut className="size-4" aria-hidden />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/** Andar de baixo: contexto. Com onze telas no roteiro, uma linha so
       *   nao comporta, e a aba ativa marca onde voce esta. */}
      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-[1280px] gap-6 px-4 md:px-6 lg:px-8">
          {LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'border-b-2 py-2.5 text-small transition-colors duration-150',
                  active
                    ? 'border-accent text-fg'
                    : 'border-transparent text-fg-muted hover:text-fg'
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}