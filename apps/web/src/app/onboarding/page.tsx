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
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-washi px-6 pt-6 pb-8 font-jp text-sumi sm:px-12 lg:px-18">
      {/* ensō: o mesmo traço do hero, fechando o ciclo do cadastro */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[6%] -right-[10%] w-[260px] lg:w-[440px]"
      >
        <svg viewBox="0 0 200 200" className="block w-full">
          <circle
            cx="100"
            cy="100"
            r="86"
            fill="none"
            stroke="#B33A3A"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray="470 70"
            transform="rotate(-24 100 100)"
            opacity="0.4"
          />
        </svg>
      </div>

      <p className="relative font-mincho text-[18px] font-medium tracking-[0.02em]">Watchlist</p>

      <div className="relative flex flex-1 items-center py-12 md:py-20">
        <OnboardingForm />
      </div>
    </main>
  );
}
