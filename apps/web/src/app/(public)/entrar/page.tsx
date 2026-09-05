import { AuthForm } from '@/components/auth-form';
import { getViewer } from '@/lib/api-server';
import { redirect } from 'next/navigation';

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
    <main className="flex min-h-dvh items-center justify-center px-4">
      <AuthForm initialError={erro ? ERRORS[erro] : undefined} />
    </main>
  );
}