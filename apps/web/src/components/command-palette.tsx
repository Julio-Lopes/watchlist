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
import { useEffect, useState } from 'react';
import { useMediaSearch } from '@/components/search-panel';

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

  const [term, setTerm] = useState('');
  const { results } = useMediaSearch(term);

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
      <CommandInput placeholder="Buscar ou ir para..." value={term} onValueChange={setTerm} />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>

        {results.length > 0 && (
          <CommandGroup heading="Mídia">
            {results.slice(0, 6).map((item) => (
              <CommandItem
                key={`${item.source}-${item.mediaType}-${item.externalId}`}
                value={`${item.title} ${item.externalId}`}
                onSelect={() => {
                  onOpenChange(false);
                  router.push(`/media/${item.source}/${item.mediaType}/${item.externalId}`);
                }}
              >
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                <span className="shrink-0 font-mincho text-[13px] text-sumi-faint">
                  {item.year ?? ''}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

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