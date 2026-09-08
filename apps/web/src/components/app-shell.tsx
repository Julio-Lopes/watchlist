'use client';

import { CommandPalette } from '@/components/command-palette';
import { Navbar } from '@/components/navbar';
import type { Viewer } from '@watchlist/shared';
import { useState } from 'react';

export function AppShell({
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
      <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6 lg:px-8">{children}</main>
    </>
  );
}