import { badges, presetAvatars, userBadges, users } from '@watchlist/db';
import {
  badgeListSchema,
  badgeStatusSchema,
  changePasswordSchema,
  deleteAccountSchema,
  presetAvatarSchema,
  sessionInfoSchema,
  settingsSchema,
  updatePreferencesSchema,
  updateProfileSchema
} from '@watchlist/shared';
import { and, eq, isNull } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { clearSessionCookie } from '../lib/cookies.js';
import { hashToken } from '../lib/crypto.js';
import { notFound, unauthorized, unprocessable } from '../lib/errors.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { consumeRateLimit } from '../lib/rate-limit.js';
import { deleteAllSessions } from '../services/session.js';
import {
  getSettings,
  listSessions,
  revokeOtherSessions,
  updatePreferences,
  updateProfile
} from '../services/settings.js';
import { sessions } from '@watchlist/db';
import { getMediaDetail } from '../services/media.js';
import { listBadges, markSeen } from '../services/badges.js';

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/me/settings',
    {
      preHandler: app.requireAuth,
      schema: { summary: 'Perfil e preferencias', tags: ['me'], response: { 200: settingsSchema } }
    },
    async (request) => getSettings(app.db, request.viewer!.id)
  );

  app.patch(
    '/me/profile',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Atualiza nome, bio, avatar, banner e tema',
        tags: ['me'],
        body: updateProfileSchema,
        response: { 200: settingsSchema }
      }
    },
    async (request) => {
      const viewer = request.viewer!;
      await consumeRateLimit(app.db, `write:user:${viewer.id}`, 120, 60);

      const { banner, ...profile } = request.body;

      let bannerMediaId: string | null | undefined;

      if (banner === null) {
        bannerMediaId = null;
      } else if (banner) {
        /** Grava a obra em media, se ainda nao existir, e devolve o id.
         *  E o mesmo caminho de abrir o detalhe: escolher persiste. */
        const detail = await getMediaDetail(
          app.db,
          banner.source,
          banner.mediaType,
          banner.externalId
        );

        if (!detail) throw notFound('Midia nao encontrada.');

        if (!detail.bannerImage) {
          throw unprocessable('Essa obra não tem banner disponível. Escolha outra.');
        }

        bannerMediaId = detail.id;
      }

      await updateProfile(app.db, viewer.id, { ...profile, bannerMediaId });
      return getSettings(app.db, viewer.id);
    }
  );

  app.patch(
    '/me/preferences',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Privacidade, fuso, escala e spoiler',
        tags: ['me'],
        body: updatePreferencesSchema,
        response: { 200: settingsSchema }
      }
    },
    async (request) => {
      const viewer = request.viewer!;
      await updatePreferences(app.db, viewer.id, request.body);
      return getSettings(app.db, viewer.id);
    }
  );

  app.get(
    '/me/sessions',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Sessoes ativas',
        tags: ['me'],
        response: { 200: z.array(sessionInfoSchema) }
      }
    },
    async (request) =>
      listSessions(app.db, request.viewer!.id, hashToken(request.sessionToken ?? ''))
  );

  app.delete(
    '/me/sessions/:id',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Encerra uma sessao',
        tags: ['me'],
        params: z.object({ id: z.string().length(64) }),
        response: { 204: z.null() }
      }
    },
    async (request, reply) => {
      const current = hashToken(request.sessionToken ?? '');

      if (request.params.id === current) {
        throw unprocessable('Para encerrar esta sessao, use o botao de sair.');
      }

      const result = await app.db
        .delete(sessions)
        .where(and(eq(sessions.id, request.params.id), eq(sessions.userId, request.viewer!.id)))
        .returning({ id: sessions.id });

      if (result.length === 0) throw notFound('Sessao nao encontrada.');

      return reply.status(204).send(null);
    }
  );

  app.patch(
    '/me/password',
    {
      preHandler: app.requireOnboarded,
      schema: {
        summary: 'Troca a senha',
        tags: ['me'],
        body: changePasswordSchema,
        response: { 200: z.object({ ok: z.literal(true) }) }
      }
    },
    async (request, reply) => {
      const viewer = request.viewer!;
      await consumeRateLimit(app.db, `password:user:${viewer.id}`, 5, 3600);

      const [row] = await app.db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, viewer.id))
        .limit(1);

      if (!row?.passwordHash) {
        throw unprocessable('Sua conta entra pelo Google e nao tem senha.');
      }

      if (!(await verifyPassword(row.passwordHash, request.body.currentPassword))) {
        throw unauthorized('Senha atual incorreta.');
      }

      await app.db
        .update(users)
        .set({ passwordHash: await hashPassword(request.body.newPassword) })
        .where(eq(users.id, viewer.id));

      /** Diferente do reset por e-mail, que derruba todas: aqui voce esta
       *  autenticado e no controle, entao a sessao atual continua. */
      await revokeOtherSessions(app.db, viewer.id, hashToken(request.sessionToken ?? ''));

      return reply.send({ ok: true as const });
    }
  );

  app.delete(
    '/me',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Exclui a conta em definitivo',
        tags: ['me'],
        body: deleteAccountSchema,
        response: { 204: z.null() }
      }
    },
    async (request, reply) => {
      const viewer = request.viewer!;

      if (request.body.confirmation !== viewer.username) {
        throw unprocessable('Digite seu nome de usuario para confirmar.');
      }

      /** Hard delete, como manda a secao de LGPD. O cascade leva entradas,
       *  eventos, reviews, coletores, tags e seguidores junto. */
      await deleteAllSessions(app.db, viewer.id);
      await app.db.delete(users).where(eq(users.id, viewer.id));

      clearSessionCookie(reply);
      return reply.status(204).send(null);
    }
  );

  app.get(
    '/avatars',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Avatares disponiveis',
        tags: ['me'],
        response: { 200: z.array(presetAvatarSchema) }
      }
    },
    async () =>
      app.db
        .select({
          id: presetAvatars.id,
          name: presetAvatars.name,
          imageUrl: presetAvatars.imageUrl,
          category: presetAvatars.category
        })
        .from(presetAvatars)
        .orderBy(presetAvatars.category, presetAvatars.id)
  );

  app.get(
    '/me/badges',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Badges do viewer, com progresso',
        tags: ['me'],
        response: { 200: badgeListSchema }
      }
    },
    async (request) => listBadges(app.db, request.viewer!.id)
  );

  app.post(
    '/me/badges/seen',
    {
      preHandler: app.requireAuth,
      schema: { summary: 'Marca as novas como vistas', tags: ['me'], response: { 204: z.null() } }
    },
    async (request, reply) => {
      await markSeen(app.db, request.viewer!.id);
      return reply.status(204).send(null);
    }
  );

  app.get(
    '/me/badges/unseen',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Badges concedidas e ainda nao vistas',
        tags: ['me'],
        response: { 200: z.array(badgeStatusSchema) }
      }
    },
    async (request) => {
      /** So le user_badges, sem avaliar criterio: esta rota roda em toda
       *  navegacao do app e nao pode custar seis queries. */
      const rows = await app.db
        .select({
          slug: badges.slug,
          name: badges.name,
          description: badges.description,
          iconName: badges.iconName,
          tier: badges.tier,
          isSecret: badges.isSecret,
          earnedAt: userBadges.earnedAt
        })
        .from(userBadges)
        .innerJoin(badges, eq(badges.id, userBadges.badgeId))
        .where(and(eq(userBadges.userId, request.viewer!.id), isNull(userBadges.seenAt)));

      return rows.map((row) => ({
        ...row,
        earnedAt: row.earnedAt.toISOString(),
        current: null,
        target: null
      }));
    }
  );
};