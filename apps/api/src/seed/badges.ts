import { badges, type Database, userBadges, watchEvents } from '@watchlist/db';
import type { BadgeCriteria } from '@watchlist/shared';
import { count, eq, sum } from 'drizzle-orm';
import type { SeedUser } from './users.js';

interface BadgeSeed {
  slug: string;
  name: string;
  description: string;
  iconName: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  criteria: BadgeCriteria;
  isSecret: boolean;
  sortOrder: number;
}

/** Catalogo global, nao dado de seed: sobrevive ao proximo seed e e
 *  atualizado por slug. O motor que avalia os criterios vem na Etapa 12. */
const CATALOG: BadgeSeed[] = [
  { slug: 'primeiros-passos', name: 'Primeiros passos', description: 'Assistiu 10 episodios.', iconName: 'Play', tier: 'bronze', criteria: { type: 'episodes_total', threshold: 10 }, isSecret: false, sortOrder: 1 },
  { slug: 'maratonista', name: 'Maratonista', description: 'Assistiu 100 episodios.', iconName: 'Flame', tier: 'silver', criteria: { type: 'episodes_total', threshold: 100 }, isSecret: false, sortOrder: 2 },
  { slug: 'devorador', name: 'Devorador', description: 'Assistiu 500 episodios.', iconName: 'TrendingUp', tier: 'gold', criteria: { type: 'episodes_total', threshold: 500 }, isSecret: false, sortOrder: 3 },
  { slug: 'colecionador', name: 'Colecionador', description: 'Concluiu 25 obras.', iconName: 'Library', tier: 'silver', criteria: { type: 'entries_completed', threshold: 25 }, isSecret: false, sortOrder: 4 },
  { slug: 'critico', name: 'Critico', description: 'Escreveu 10 reviews.', iconName: 'NotebookPen', tier: 'silver', criteria: { type: 'reviews_written', threshold: 10 }, isSecret: false, sortOrder: 5 },
  { slug: 'constante', name: 'Constante', description: 'Manteve 30 dias de streak.', iconName: 'Activity', tier: 'gold', criteria: { type: 'streak_days', threshold: 30 }, isSecret: false, sortOrder: 6 },
  { slug: 'coruja', name: 'Coruja', description: 'Registrou 50 episodios de madrugada.', iconName: 'Star', tier: 'bronze', criteria: { type: 'night_owl', threshold: 50 }, isSecret: true, sortOrder: 7 },
  { slug: 'sessao-dupla', name: 'Sessao dupla', description: 'Assistiu 12 episodios em um unico dia.', iconName: 'ChartColumn', tier: 'bronze', criteria: { type: 'single_day_episodes', threshold: 12 }, isSecret: false, sortOrder: 8 },
  { slug: 'contrariado', name: 'Contrariado', description: 'Notas bem diferentes da media.', iconName: 'ChartPie', tier: 'gold', criteria: { type: 'rating_variance', minVariance: 400 }, isSecret: true, sortOrder: 9 },
  { slug: 'fa-de-sci-fi', name: 'Fa de sci-fi', description: 'Concluiu 10 obras de ficcao cientifica.', iconName: 'Trophy', tier: 'silver', criteria: { type: 'genre_count', genre: 'Sci-Fi', threshold: 10 }, isSecret: false, sortOrder: 10 }
];

export async function seedBadges(db: Database, people: SeedUser[]): Promise<void> {
  await db
    .insert(badges)
    .values(CATALOG)
    .onConflictDoUpdate({
      target: badges.slug,
      set: {
        name: badges.name,
        description: badges.description,
        criteria: badges.criteria,
        tier: badges.tier
      }
    });

  const rows = await db.select({ id: badges.id, slug: badges.slug }).from(badges);
  const bySlug = new Map(rows.map((row) => [row.slug, row.id]));

  for (const person of people) {
    const [totals] = await db
      .select({ episodes: sum(watchEvents.episodesDelta), events: count() })
      .from(watchEvents)
      .where(eq(watchEvents.userId, person.id));

    const episodes = Number(totals?.episodes ?? 0);

    /** Concedidas conforme o dado realmente gerado, nao ao acaso: badge que
     *  nao corresponde ao historico quebraria a tela da Etapa 12. */
    const earned = [
      episodes >= 10 && 'primeiros-passos',
      episodes >= 100 && 'maratonista',
      episodes >= 500 && 'devorador'
    ].filter((slug): slug is string => typeof slug === 'string');

    for (const slug of earned) {
      const badgeId = bySlug.get(slug);
      if (!badgeId) continue;

      await db
        .insert(userBadges)
        .values({ userId: person.id, badgeId, progress: { current: episodes, target: episodes } })
        .onConflictDoNothing();
    }
  }
}