import { z } from 'zod';
import { PLACEHOLDER_USERNAME_PREFIX, RESERVED_USERNAMES } from './enums';

export const usernameSchema = z
  .string()
  .min(3, 'Minimo de 3 caracteres.')
  .max(30, 'Maximo de 30 caracteres.')
  .regex(/^[a-z0-9_]+$/, 'Use apenas letras minusculas, numeros e underscore.')
  .refine((value) => !RESERVED_USERNAMES.has(value), 'Esse nome esta reservado.')
  .refine(
    (value) => !value.startsWith(PLACEHOLDER_USERNAME_PREFIX),
    'Esse nome esta reservado.'
  );

/** Normaliza para minusculas na validacao: o UNIQUE simples do banco depende disso. */
export const emailSchema = z.email().max(255).toLowerCase();

/** Comprimento acima de composicao: regra de simbolo produz "Senha@123". */
export const passwordSchema = z.string().min(10, 'Minimo de 10 caracteres.').max(200);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().min(1).max(60).optional()
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200)
});

export const setUsernameSchema = z.object({ username: usernameSchema });
export const verifyEmailSchema = z.object({ token: z.string().min(1).max(200) });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(200),
  password: passwordSchema
});

export const viewerSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  email: z.string(),
  role: z.string(),
  emailVerified: z.boolean(),
  /** true enquanto username_set_at for NULL: o front leva para o onboarding. */
  needsUsername: z.boolean()
});

export type Viewer = z.infer<typeof viewerSchema>;
