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
    /** Dividida no desktop; no mobile o painel sumi some e sobra o formulário. */
    <main className="flex min-h-dvh flex-wrap items-stretch bg-washi font-jp text-sumi">
      <AuthForm initialError={erro ? ERRORS[erro] : undefined} />
      <LoginShowcase />
    </main>
  );
}
