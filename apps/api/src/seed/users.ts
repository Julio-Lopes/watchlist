import { type Database, presetAvatars, users, userProfiles } from '@watchlist/db';
import { like } from 'drizzle-orm';
import { hashPassword } from '../lib/password.js';
import type { Random } from './random.js';

/** Toda conta de seed termina assim. E o que torna o script idempotente:
 *  rodar de novo apaga so o que ele criou, nunca a sua conta real. */
export const SEED_EMAIL_SUFFIX = '@seed.local';

const AVATAR_STYLES = ['adventurer', 'bottts', 'lorelei', 'notionists'] as const;

/** 24 avatares gerados por semente. Sao registros com URL, nao arquivos:
 *  o armazenamento em R2 so e decidido na Etapa 17. */
const PRESET_AVATARS = AVATAR_STYLES.flatMap((style, styleIndex) =>
  Array.from({ length: 6 }, (_, index) => {
    const seed = `wl-${styleIndex}-${index}`;
    return {
      id: `${style}-${index + 1}`,
      name: `${style} ${index + 1}`,
      imageUrl: `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`,
      category: style,
      isPremium: false
    };
  })
);

const PEOPLE = [
  { username: 'marina_sc', displayName: 'Marina Salgado' },
  { username: 'tiagoferr', displayName: 'Tiago Ferreira' },
  { username: 'lu_andrade', displayName: 'Luiza Andrade' },
  { username: 'pedrocosta', displayName: 'Pedro Costa' },
  { username: 'anaclara', displayName: 'Ana Clara Mendes' },
  { username: 'rafa_lima', displayName: 'Rafael Lima' },
  { username: 'bia_ramos', displayName: 'Beatriz Ramos' },
  { username: 'gustavo_mt', displayName: 'Gustavo Matos' },
  { username: 'carol_dias', displayName: 'Carolina Dias' },
  { username: 'nunes_dev', displayName: 'Henrique Nunes' },
  { username: 'julia_rt', displayName: 'Julia Rocha' },
  { username: 'vitor_ss', displayName: 'Vitor Santos' },
  { username: 'lari_gomes', displayName: 'Larissa Gomes' },
  { username: 'diego_ap', displayName: 'Diego Alves' },
  { username: 'fer_oliveira', displayName: 'Fernanda Oliveira' }
];

const BIOS = [
  'Vejo mais anime do que deveria e durmo menos do que precisava.',
  'Filme cabeca de terca, comfort show de domingo.',
  'Tentando zerar a lista de planejados antes de 2030.',
  'Nota 10 e raro. Nota 4 tambem.',
  'Aqui pelas trilhas sonoras, fico pelas historias.',
  null
];

export interface SeedUser {
  id: string;
  username: string;
  timezone: string;
}

export async function seedUsers(db: Database, random: Random): Promise<SeedUser[]> {
  await db
    .insert(presetAvatars)
    .values(PRESET_AVATARS)
    .onConflictDoUpdate({
      target: presetAvatars.id,
      set: { name: presetAvatars.name, imageUrl: presetAvatars.imageUrl }
    });

  /** Cascade cuida de perfis, entradas, eventos, reviews e seguidores. */
  await db.delete(users).where(like(users.email, `%${SEED_EMAIL_SUFFIX}`));

  /** Um hash so para os 15: argon2id custa 19 MiB e 2 iteracoes por chamada,
   *  e nenhuma dessas contas serve para login real. */
  const passwordHash = await hashPassword('seed-password-nao-use-em-nada');

  const created: SeedUser[] = [];

  for (const person of PEOPLE) {
    const avatar = random.pick(PRESET_AVATARS);
    const now = Date.now();

    const [user] = await db
      .insert(users)
      .values({
        username: person.username,
        email: `${person.username}${SEED_EMAIL_SUFFIX}`,
        passwordHash,
        displayName: person.displayName,
        avatarUrl: avatar.imageUrl,
        emailVerifiedAt: new Date(),
        /** Preenchido: conta de seed nao esta em onboarding. */
        usernameSetAt: new Date(now - random.int(30, 540) * 86_400_000)
      })
      .returning({ id: users.id });

    if (!user) continue;

    await db.insert(userProfiles).values({
      userId: user.id,
      avatarType: 'preset',
      avatarPresetId: avatar.id,
      bio: random.pick(BIOS),
      theme: random.pick(['cinema', 'manga', 'retro'] as const),
      isPrivate: random.chance(0.15),
      ratingScale: random.pick(['ten', 'hundred', 'stars'] as const),
      spoilerMode: random.pick(['off', 'soft', 'soft', 'strict'] as const)
    });

    created.push({ id: user.id, username: person.username, timezone: 'America/Sao_Paulo' });
  }

  return created;
}