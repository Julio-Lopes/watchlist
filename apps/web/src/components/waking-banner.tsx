'use client';

import { Loader2 } from '@/lib/icons';
import { onWakingChange } from '@/lib/api-client';
import { useEffect, useState } from 'react';

export function WakingBanner() {
  const [waking, setWaking] = useState(false);

  useEffect(() => onWakingChange(setWaking), []);

  if (!waking) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 border-t border-border bg-surface px-4 py-3 text-small text-fg-muted"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      Acordando o servidor. Isso leva alguns segundos na primeira vez.
    </div>
  );
}