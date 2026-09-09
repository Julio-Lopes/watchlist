import { ReviewEditor } from '@/components/review-editor';
import { serverFetch } from '@/lib/api-server';
import { entrySchema, ownReviewSchema } from '@watchlist/shared';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Escrever review · Watchlist' };

export default async function ReviewPage({
  params
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await params;

  const [entry, existing] = await Promise.all([
    serverFetch(`/entries/${entryId}`, entrySchema),
    serverFetch(`/entries/${entryId}/review`, ownReviewSchema.nullable())
  ]);

  if (!entry) notFound();

  return (
    <ReviewEditor
      entry={entry}
      existing={
        existing
          ? {
              id: existing.id,
              content: existing.content,
              containsSpoilers: existing.containsSpoilers
            }
          : null
      }
    />
  );
}