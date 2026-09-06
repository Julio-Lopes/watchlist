import { AuthForm } from '@/components/auth-form';
import { LoginShowcase } from '@/components/login-showcase';
import { getViewer } from '@/lib/api-server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  oauth: 'Não foi possível concluir o login com o Google. Tente de novo.'
};

export default async function EntrarPage({
  searchParams
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (await getViewer()) redirect('/inicio');

  const { erro } = await searchParams;

  return (
    /** Dividida no desktop; no mobile a vitrine some e sobra o formulario,
     *  em vez de virar um segundo desenho para manter. */
    <main className="grid min-h-dvh lg:grid-cols-2">
      <LoginShowcase />
      <div className="flex items-center justify-center px-6 py-12">
        <AuthForm initialError={erro ? ERRORS[erro] : undefined} />
      </div>
    </main>
  );
}