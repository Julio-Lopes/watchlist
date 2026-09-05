'use client';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { CalendarDays, LayoutDashboard, Library, NotebookPen, Settings, Trophy } from '@/lib/icons';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ROUTES = [
  { href: '/inicio', label: 'Início', icon: LayoutDashboard },
  { href: '/biblioteca', label: 'Biblioteca', icon: Library },
  { href: '/diario', label: 'Diário', icon: NotebookPen },
  { href: '/calendario', label: 'Calendário', icon: CalendarDays },
  { href: '/ranking', label: 'Ranking', icon: Trophy },
  { href: '/config', label: 'Configurações', icon: Settings }
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const router = useRouter();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {/** A busca de mídia entra aqui na Etapa 8. Por ora, so navegacao:
       *   paleta que promete busca e nao busca e pior que paleta sem busca. */}
      <CommandInput placeholder="Ir para..." />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          {ROUTES.map(({ href, label, icon: Icon }) => (
            <CommandItem
              key={href}
              value={label}
              onSelect={() => {
                onOpenChange(false);
                router.push(href);
              }}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}