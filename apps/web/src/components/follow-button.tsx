'use client';

import { ApiError, apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
  username: string;
  initialFollowing: boolean;
}

/** Seguir é o único botão preenchido do perfil. */
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
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        'shrink-0 cursor-pointer border px-5 py-2.5 text-[11.5px] tracking-[0.12em] uppercase transition-colors duration-400 disabled:opacity-60',
        following
          ? 'border-[#d9d4cd] bg-transparent text-sumi hover:border-torii hover:text-torii'
          : 'border-sumi bg-sumi text-washi hover:border-torii hover:bg-torii'
      )}
    >
      {following ? (hovering ? 'Deixar de seguir' : 'Seguindo') : 'Seguir'}
    </button>
  );
}
