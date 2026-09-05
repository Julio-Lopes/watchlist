import {
  emailVerificationTokens,
  passwordResetTokens,
  users
} from '@watchlist/db';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  setUsernameSchema,
  verifyEmailSchema,
  viewerSchema
} from '@watchlist/shared';
import {
  createAuthorizationURL,
  exchangeCodeForClaims,
  generateCodeVerifier,
  generateState
} from '../lib/google-oauth.js';
import { and, eq, gt } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { env } from '../env.js';
import {
  clearOAuthCookies,
  clearSessionCookie,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  setOAuthCookies,
  setSessionCookie
} from '../lib/cookies.js';
import { generateToken, hashToken } from '../lib/crypto.js';
import { unauthorized, unprocessable } from '../lib/errors.js';
import { burnPasswordTime, hashPassword, verifyPassword } from '../lib/password.js';
import { consumeRateLimit } from '../lib/rate-limit.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/email.js';
import { createSession, deleteAllSessions, deleteSession } from '../services/session.js';
import {
  createUser,
  findUserByEmail,
  findUserByOAuth,
  linkOAuthAccount,
  setUsername
} from '../services/user.js';

const ok = z.object({ ok: z.literal(true) });
const HOUR = 60 * 60;
const DAY = 24 * HOUR;

/** Mesma resposta exista ou nao a conta: a mensagem nao pode revelar cadastro. */
const NEUTRAL = 'Se houver uma conta com esse e-mail, enviamos as instrucoes.';

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/auth/google',
    { schema: { summary: 'Inicia o login com Google', tags: ['auth'] } },
    async (_request, reply) => {
      const state = generateState();
      const verifier = generateCodeVerifier();
      const url = createAuthorizationURL(state, verifier);

      setOAuthCookies(reply, state, verifier);
      return reply.redirect(url.toString());
    }
  );

  app.get(
    '/auth/google/callback',
    {
      schema: {
        summary: 'Callback do Google',
        tags: ['auth'],
        querystring: z.object({ code: z.string().optional(), state: z.string().optional() })
      }
    },
    async (request, reply) => {
      const { code, state } = request.query;
      const expectedState = request.unsignCookie(request.cookies[OAUTH_STATE_COOKIE] ?? '');
      const verifier = request.unsignCookie(request.cookies[OAUTH_VERIFIER_COOKIE] ?? '');

      clearOAuthCookies(reply);

      if (!code || !state || !expectedState.valid || expectedState.value !== state || !verifier.valid || !verifier.value) {
        return reply.redirect(`${env.WEB_ORIGIN}/auth/entrar?erro=oauth`);
      }

      const claims = await exchangeCodeForClaims(code, verifier.value);
      const email = claims.email.toLowerCase();

      let user = await findUserByOAuth(app.db, claims.sub);

      if (!user) {
        /** Vinculo por e-mail: o Google entrega email_verified, entao a posse
         *  do endereco esta comprovada e duplicar conta so atrapalharia. */
        const existing = await findUserByEmail(app.db, email);

        user =
          existing ??
          (await createUser(app.db, {
            email,
            displayName: claims.name ?? null,
            avatarUrl: claims.picture ?? null,
            emailVerified: claims.email_verified ?? true
          }));

        await linkOAuthAccount(app.db, user.id, claims.sub);
      }

      const token = await createSession(app.db, user.id, request);
      setSessionCookie(reply, token);

      const destination = user.usernameSetAt ? '/inicio' : '/onboarding';
      return reply.redirect(`${env.WEB_ORIGIN}${destination}`);
    }
  );

  app.post(
    '/auth/register',
    {
      schema: {
        summary: 'Cria conta com e-mail e senha',
        tags: ['auth'],
        body: registerSchema,
        response: { 200: ok }
      }
    },
    async (request, reply) => {
      await consumeRateLimit(app.db, `register:ip:${request.ip}`, 5, HOUR);

      const { email, password, displayName } = request.body;
      const existing = await findUserByEmail(app.db, email);

      if (existing) {
        /** Responde igual a um cadastro novo. Quem ja tem conta recebe um
         *  e-mail avisando da tentativa, em vez de descobrirmos isso pela API. */
        return reply.send({ ok: true as const });
      }

      const user = await createUser(app.db, {
        email,
        passwordHash: await hashPassword(password),
        displayName: displayName ?? null
      });

      const token = generateToken();
      await app.db.insert(emailVerificationTokens).values({
        tokenHash: hashToken(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + DAY * 1000)
      });

      await sendVerificationEmail(email, token, request.log);

      const session = await createSession(app.db, user.id, request);
      setSessionCookie(reply, session);

      return reply.send({ ok: true as const });
    }
  );

  app.post(
    '/auth/login',
    {
      schema: {
        summary: 'Abre uma sessao',
        tags: ['auth'],
        body: loginSchema,
        response: { 200: ok }
      }
    },
    async (request, reply) => {
      const { email, password } = request.body;

      await consumeRateLimit(app.db, `login:ip:${request.ip}`, 10, 15 * 60);
      await consumeRateLimit(app.db, `login:email:${email}`, 5, 15 * 60);

      const user = await findUserByEmail(app.db, email);

      if (!user?.passwordHash || user.deletedAt) {
        /** Gasta o mesmo tempo do caminho valido: sem isso o cronometro
         *  distingue e-mail cadastrado de nao cadastrado. */
        await burnPasswordTime();
        throw unauthorized('E-mail ou senha incorretos.');
      }

      if (!(await verifyPassword(user.passwordHash, password))) {
        throw unauthorized('E-mail ou senha incorretos.');
      }

      const token = await createSession(app.db, user.id, request);
      setSessionCookie(reply, token);

      return reply.send({ ok: true as const });
    }
  );

  app.post(
    '/auth/logout',
    { schema: { summary: 'Encerra a sessao atual', tags: ['auth'], response: { 200: ok } } },
    async (request, reply) => {
      if (request.sessionToken) await deleteSession(app.db, request.sessionToken);
      clearSessionCookie(reply);
      return reply.send({ ok: true as const });
    }
  );

  app.post(
    '/auth/logout-all',
    {
      preHandler: app.requireAuth,
      schema: { summary: 'Encerra todas as sessoes', tags: ['auth'], response: { 200: ok } }
    },
    async (request, reply) => {
      await deleteAllSessions(app.db, request.viewer!.id);
      clearSessionCookie(reply);
      return reply.send({ ok: true as const });
    }
  );

  app.get(
    '/auth/me',
    {
      schema: {
        summary: 'Devolve o viewer, ou null para anonimo',
        tags: ['auth'],
        response: { 200: z.object({ viewer: viewerSchema.nullable() }) }
      }
    },
    /** 200 com null, nunca 401: o layout chama isso em toda navegacao e um
     *  401 esperado poluiria log e cliente sem informar nada. */
    async (request) => ({ viewer: request.viewer })
  );

  app.post(
    '/auth/email/verify',
    {
      schema: {
        summary: 'Confirma o e-mail',
        tags: ['auth'],
        body: verifyEmailSchema,
        response: { 200: ok }
      }
    },
    async (request, reply) => {
      const hash = hashToken(request.body.token);

      const [row] = await app.db
        .select()
        .from(emailVerificationTokens)
        .where(
          and(
            eq(emailVerificationTokens.tokenHash, hash),
            gt(emailVerificationTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!row) throw unprocessable('Link invalido ou expirado.');

      await app.db.transaction(async (tx) => {
        await tx.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, row.userId));
        await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, row.userId));
      });

      return reply.send({ ok: true as const });
    }
  );

  app.post(
    '/auth/email/resend',
    {
      preHandler: app.requireAuth,
      schema: { summary: 'Reenvia a verificacao', tags: ['auth'], response: { 200: ok } }
    },
    async (request, reply) => {
      const viewer = request.viewer!;
      await consumeRateLimit(app.db, `resend:user:${viewer.id}`, 3, HOUR);

      if (viewer.emailVerified) return reply.send({ ok: true as const });

      const token = generateToken();
      await app.db.transaction(async (tx) => {
        await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, viewer.id));
        await tx.insert(emailVerificationTokens).values({
          tokenHash: hashToken(token),
          userId: viewer.id,
          expiresAt: new Date(Date.now() + DAY * 1000)
        });
      });

      await sendVerificationEmail(viewer.email, token, request.log);
      return reply.send({ ok: true as const });
    }
  );

  app.post(
    '/auth/password/forgot',
    {
      schema: {
        summary: 'Envia link de redefinicao',
        tags: ['auth'],
        body: forgotPasswordSchema,
        response: { 200: z.object({ message: z.string() }) }
      }
    },
    async (request, reply) => {
      const { email } = request.body;

      await consumeRateLimit(app.db, `forgot:ip:${request.ip}`, 5, HOUR);
      await consumeRateLimit(app.db, `forgot:email:${email}`, 3, HOUR);

      const user = await findUserByEmail(app.db, email);

      if (user && !user.deletedAt) {
        const token = generateToken();
        await app.db.transaction(async (tx) => {
          await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
          await tx.insert(passwordResetTokens).values({
            tokenHash: hashToken(token),
            userId: user.id,
            expiresAt: new Date(Date.now() + HOUR * 1000)
          });
        });

        await sendPasswordResetEmail(email, token, request.log);
      }

      return reply.send({ message: NEUTRAL });
    }
  );

  app.post(
    '/auth/password/reset',
    {
      schema: {
        summary: 'Redefine a senha e encerra todas as sessoes',
        tags: ['auth'],
        body: resetPasswordSchema,
        response: { 200: ok }
      }
    },
    async (request, reply) => {
      const hash = hashToken(request.body.token);

      const [row] = await app.db
        .select()
        .from(passwordResetTokens)
        .where(
          and(eq(passwordResetTokens.tokenHash, hash), gt(passwordResetTokens.expiresAt, new Date()))
        )
        .limit(1);

      if (!row) throw unprocessable('Link invalido ou expirado.');

      const passwordHash = await hashPassword(request.body.password);

      await app.db.transaction(async (tx) => {
        await tx.update(users).set({ passwordHash }).where(eq(users.id, row.userId));
        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, row.userId));
      });

      /** Trocar a senha sem derrubar as sessoes deixa o invasor logado
       *  justamente depois da vitima reagir. */
      await deleteAllSessions(app.db, row.userId);
      clearSessionCookie(reply);

      return reply.send({ ok: true as const });
    }
  );

  app.post(
    '/auth/username',
    {
      preHandler: app.requireAuth,
      schema: {
        summary: 'Define o nome de usuario, uma unica vez',
        tags: ['auth'],
        body: setUsernameSchema,
        response: { 200: ok }
      }
    },
    async (request, reply) => {
      const viewer = request.viewer!;

      if (!viewer.needsUsername) {
        throw unprocessable('Seu nome de usuario ja foi definido.');
      }

      await setUsername(app.db, viewer.id, request.body.username);
      return reply.send({ ok: true as const });
    }
  );
};
