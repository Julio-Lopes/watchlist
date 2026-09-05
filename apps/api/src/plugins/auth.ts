import type { Viewer } from '@watchlist/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { SESSION_COOKIE } from '../lib/cookies.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { resolveViewer } from '../services/session.js';

declare module 'fastify' {
  interface FastifyRequest {
    viewer: Viewer | null;
    sessionToken: string | null;
  }
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireOnboarded: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest('viewer', null);
  app.decorateRequest('sessionToken', null);

  app.addHook('onRequest', async (request) => {
    const token = request.cookies[SESSION_COOKIE];
    if (!token) return;

    request.sessionToken = token;
    request.viewer = await resolveViewer(app.db, token);
  });

  app.decorate('requireAuth', async (request: FastifyRequest) => {
    if (!request.viewer) throw unauthorized();
  });

  /** Conta em onboarding le, mas nao escreve. Ver decisao da opcao A. */
  app.decorate('requireOnboarded', async (request: FastifyRequest) => {
    if (!request.viewer) throw unauthorized();
    if (request.viewer.needsUsername) {
      throw forbidden('Escolha seu nome de usuario antes de continuar.');
    }
  });
});