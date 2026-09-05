import { AppShell } from '@/components/app-shell';
import { getViewer } from '@/lib/api-server';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  if (!viewer) redirect('/entrar');
  /** Conta em onboarding nao entra no app. O onboarding vive fora deste
   *  grupo justamente para nao cair em loop de redirect com este layout. */
  if (viewer.needsUsername) redirect('/onboarding');

  return <AppShell viewer={viewer}>{children}</AppShell>;
}