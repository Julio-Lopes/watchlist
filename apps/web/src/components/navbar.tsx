'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { apiFetch } from '@/lib/api-client';
import { Flame, LogOut, Search, Settings, Trophy, Upload, User } from '@/lib/icons';
import type { Viewer } from '@watchlist/shared';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/inicio', label: 'Início' },
  { href: '/biblioteca', label: 'Biblioteca' },
  { href: '/diario', label: 'Diário' },
  { href: '/calendario', label: 'Calendário' },
  { href: '/estatisticas', label: 'Estatísticas' },
  { href: '/ranking', label: 'Ranking' },
  { href: '/colecoes', label: 'Coleções' }
];

/** Navbar do app logado — tema "Japanese Modern". */
export function Navbar({
  viewer,
  streak = null,
  onOpenPalette
}: {
  viewer: Viewer;
  streak?: number | null;
  onOpenPalette: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-washi/95 backdrop-blur-md">
      <div className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,32px)]">
        <div className="flex items-center gap-5 py-4 pb-3.5">
          <Link href="/inicio" className="font-mincho text-[18px] font-medium tracking-[0.02em] text-sumi">
            Watchlist
          </Link>

          <div className="ml-auto flex items-center gap-[clamp(14px,2vw,22px)]">
            <button
              type="button"
              onClick={onOpenPalette}
              aria-label="Buscar"
              className="flex cursor-pointer border-0 bg-transparent p-1.5 text-sumi-soft transition-colors duration-400 hover:text-sumi"
            >
              <Search className="size-[17px]" strokeWidth={1.2} aria-hidden />
            </button>

            {streak !== null && streak > 0 && (
              <span
                className="flex items-center gap-1.5 text-[12.5px] tracking-[0.06em] text-torii"
                title="Sequência atual"
              >
                <Flame className="size-3.5" strokeWidth={1.2} strokeLinejoin="round" aria-hidden />
                {streak}
              </span>
            )}

            <span className="h-[18px] w-px bg-hairline" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Menu da conta"
                  className="flex size-[30px] cursor-pointer items-center justify-center rounded-full border border-[#d9d4cd] bg-transparent p-0 text-sumi-soft transition-colors duration-400 hover:border-sumi hover:text-sumi"
                >
                  {viewer.avatarUrl ? (
                    <img src={viewer.avatarUrl} alt="" className="size-full rounded-full object-cover" />
                  ) : (
                    <User className="size-[15px]" strokeWidth={1.2} aria-hidden />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <span className="block truncate font-mincho text-base text-sumi">
                    {viewer.displayName ?? viewer.username}
                  </span>
                  <span className="mt-0.5 block truncate text-xs tracking-[0.04em] text-sumi-faint">
                    @{viewer.username}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
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

        <nav className="flex items-center gap-[clamp(16px,2.6vw,30px)] overflow-x-auto pb-3 text-[13px] tracking-[0.05em]">
          {LINKS.map((link) => {
            const active = link.href === '/inicio' ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative shrink-0 pb-[3px] transition-colors duration-400 ${
                  active ? 'text-sumi' : 'text-sumi-faint hover:text-sumi'
                }`}
              >
                {link.label}
                <span
                  className={`absolute bottom-0 left-0 h-px w-full origin-left bg-torii transition-transform duration-450 ease-out ${
                    active ? 'scale-x-100 bg-sumi' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
