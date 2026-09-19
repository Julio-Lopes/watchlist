'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const SECTIONS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'privacidade', label: 'Privacidade' },
  { id: 'preferencias', label: 'Preferências' },
  { id: 'sessoes', label: 'Sessões' },
  { id: 'conta', label: 'Conta' },
  { id: 'dados', label: 'Dados' },
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
      { rootMargin: '-140px 0px -66% 0px' }
    );

    for (const section of SECTIONS) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <nav className="sticky top-[126px] hidden min-w-0 lg:block">
      <p className="border-b border-hairline pb-3 text-[11px] tracking-[0.2em] text-sumi-faint uppercase">
        Nesta página
      </p>
      <div className="mt-2.5 flex flex-col">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={cn(
              'py-[7px] text-[13.5px] transition-all duration-400',
              active === section.id
                ? 'pl-2.5 shadow-[inset_3px_0_0_-1px_var(--color-torii)]'
                : '',
              active === section.id
                ? 'text-sumi'
                : section.danger
                  ? 'text-torii/70 hover:text-torii'
                  : 'text-sumi-soft hover:text-sumi'
            )}
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
