import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { env } from '../env.js';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const generateState = (): string => randomBytes(32).toString('base64url');
export const generateCodeVerifier = (): string => randomBytes(32).toString('base64url');

const challengeFor = (verifier: string): string =>
  createHash('sha256').update(verifier).digest('base64url');

export function createAuthorizationURL(state: string, verifier: string): URL {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', env.GOOGLE_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challengeFor(verifier));
  url.searchParams.set('code_challenge_method', 'S256');
  return url;
}

const tokenResponseSchema = z.object({ id_token: z.string() });

/** Os claims chegam do endpoint de token, por TLS, servidor a servidor.
 *  Verificar assinatura aqui protegeria contra um canal que nao usamos. */
const claimsSchema = z.object({
  sub: z.string(),
  email: z.string(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  picture: z.string().optional()
});

export type GoogleClaims = z.infer<typeof claimsSchema>;

export async function exchangeCodeForClaims(
  code: string,
  verifier: string
): Promise<GoogleClaims> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier
    })
  });

  if (!response.ok) {
    throw new Error(`token endpoint respondeu ${response.status}`);
  }

  const { id_token: idToken } = tokenResponseSchema.parse(await response.json());
  const payload = idToken.split('.')[1];

  if (!payload) throw new Error('id_token malformado');

  return claimsSchema.parse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')));
}