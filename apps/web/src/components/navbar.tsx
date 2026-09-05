'use client';

import type { Viewer } from '@watchlist/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { apiFetch } from '@/lib/api-client';
import {
  CalendarDays,
  Command,
  LayoutDashboard,
  Library,
  LogOut,
  NotebookPen,
  Settings,
  Trophy,
  User
} from '@/lib/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/inicio', label: 'InÃ­cio', icon: LayoutDashboard },
  { href: '/biblioteca', label: 'Biblioteca', icon: Library },
  { href: '/diario', label: 'DiÃ¡rio', icon: NotebookPen },
  { href: '/calendario', label: 'CalendÃ¡rio', icon: CalendarDays },
  { href: '/ranking', label: 'Ranking', icon: Trophy }
];

export function Navbar({ viewer, onOpenPalette }: { viewer: Viewer; onOpenPalette: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-6 px-4 md:px-6 lg:px-8">
        <Link href="/inicio" className="font-serif text-h3">
          Watchlist
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-1.5 text-small transition-colors duration-150 hover:bg-surface-hover',
                pathname.startsWith(href) ? 'text-fg' : 'text-fg-muted'
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenPalette}
            className="hidden items-center gap-2 text-fg-muted sm:flex"
          >
            <Command className="size-4" aria-hidden />
            Buscar
            <kbd className="font-data text-caption">âŒ˜K</kbd>
          </Button>

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
                  ConfiguraÃ§Ãµes
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
    </header>
  );
}
