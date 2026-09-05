import { getViewer } from '@/lib/api-server';

export default async function InicioPage() {
  const viewer = await getViewer();

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-h1">Olá, {viewer?.displayName ?? viewer?.username}</h1>
      <p className="text-body text-fg-muted">
        A biblioteca, o diário e as estatísticas chegam nas próximas etapas.
      </p>
    </div>
  );
}