import { OnboardingForm } from '@/components/onboarding-form';
import { getViewer } from '@/lib/api-server';
import { redirect } from 'next/navigation';

/** Depende de sessao: nunca pode ser pre-renderizada no build. */
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  
  const viewer = await getViewer();

  if (!viewer) redirect('/entrar');
  if (!viewer.needsUsername) redirect('/inicio');

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <OnboardingForm />
    </main>
  );
}