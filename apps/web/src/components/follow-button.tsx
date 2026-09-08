'use client';

import { Button } from '@/components/ui/button';
import { ApiError, apiFetch } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
  username: string;
  initialFollowing: boolean;
}

export function FollowButton({ username, initialFollowing }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [hovering, setHovering] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !following;
    /** Otimista: seguir alguem e reversivel e barato, e esperar meio segundo
     *  por um botao binario parece defeito. */
    setFollowing(next);
    setBusy(true);

    try {
      await apiFetch(`/users/${username}/follow`, { method: next ? 'POST' : 'DELETE' });
      router.refresh();
    } catch (cause) {
      setFollowing(!next);
      toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível concluir.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={following ? 'outline' : 'default'}
      onClick={() => void toggle()}
      disabled={busy}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="shrink-0"
    >
      {following ? (hovering ? 'Deixar de seguir' : 'Seguindo') : 'Seguir'}
    </Button>
  );
}