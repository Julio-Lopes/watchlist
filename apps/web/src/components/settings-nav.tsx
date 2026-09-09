'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const SECTIONS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'privacidade', label: 'Privacidade' },
  { id: 'preferencias', label: 'Preferências' },
  { id: 'sessoes', label: 'Sessões' },
  { id: 'conta', label: 'Conta' },
  { id: 'excluir', label: 'Excluir', danger: true }
];

export function SettingsNav() {
  const [active, setActive] = useState('perfil');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      /** Ativa quando a secao cruza o terco superior: usar o centro faria o
       *  indice mudar tarde demais em secoes curtas. */
      { rootMargin: '-80px 0px -66% 0px' }
    );

    for (const section of SECTIONS) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <nav className="sticky top-28 hidden lg:block">
      <p className="text-caption tracking-wide text-fg-muted uppercase">Nesta página</p>
      <div className="mt-3 flex flex-col gap-2 border-l border-border">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={cn(
              '-ml-px border-l pl-3 text-small transition-colors duration-150',
              active === section.id
                ? 'border-accent text-fg'
                : 'border-transparent text-fg-muted hover:text-fg',
              section.danger && active !== section.id ? 'text-danger/70 hover:text-danger' : ''
            )}
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}