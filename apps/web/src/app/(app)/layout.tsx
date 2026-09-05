import { AppShell } from '@/components/app-shell';
import { getViewer } from '@/lib/api-server';
import { redirect } from 'next/navigation';

/** Depende de sessao: nunca pode ser pre-renderizada no build. */
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  if (!viewer) redirect('/entrar');
  /** Conta em onboarding nao entra no app. O onboarding vive fora deste
   *  grupo justamente para nao cair em loop de redirect com este layout. */
  if (viewer.needsUsername) redirect('/onboarding');

  return <AppShell viewer={viewer}>{children}</AppShell>;
}