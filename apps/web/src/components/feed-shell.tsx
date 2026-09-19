'use client';

import { CommandPalette } from '@/components/command-palette';
import { Navbar } from '@/components/navbar';
import type { Viewer } from '@watchlist/shared';
import { useState } from 'react';

/** Equivalente ao @/components/app-shell.tsx, na paleta washi/sumi. */
export function FeedShell({
  viewer,
  streak = null,
  children
}: {
  viewer: Viewer;
  streak?: number | null;
  children: React.ReactNode;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <>
      <Navbar viewer={viewer} streak={streak} onOpenPalette={() => setPaletteOpen(true)} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <main className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,32px)] py-[clamp(32px,6vh,60px)] pb-[clamp(60px,10vh,110px)]">
        {children}
      </main>
    </>
  );
}
