import { z } from 'zod';
import {
  avatarTypeSchema,
  mediaSourceSchema,
  mediaTypeSchema,
  profileThemeSchema,
  ratingScaleSchema,
  spoilerModeSchema
} from './enums';
import { passwordSchema } from './auth';

export const settingsSchema = z.object({
  username: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  /** Conta so por OAuth nao tem senha para trocar. */
  hasPassword: z.boolean(),
  displayName: z.string().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  avatarType: avatarTypeSchema,
  avatarPresetId: z.string().nullable(),
  bannerMediaId: z.uuid().nullable(),
  bannerImage: z.string().nullable(),
  bannerTitle: z.string().nullable(),
  theme: profileThemeSchema,
  isPrivate: z.boolean(),
  timezone: z.string(),
  ratingScale: ratingScaleSchema,
  spoilerMode: spoilerModeSchema,
  /** Numeros reais do viewer, para a previa nao mostrar dado inventado. */
  totalEntries: z.number(),
  totalMinutes: z.number(),
  currentStreak: z.number()
});

export const updateProfileSchema = z.object({
  displayName: z.string().max(60).nullable().optional(),
  bio: z.string().max(300).nullable().optional(),
  avatarPresetId: z.string().max(50).nullable().optional(),
  /** Referencia externa, nao id local: a obra pode ainda nao existir em media.
   *  Escolher o banner e o gesto que a persiste, como abrir o detalhe.
   *  null remove o banner. */
  banner: z
    .object({
      source: mediaSourceSchema,
      mediaType: mediaTypeSchema,
      externalId: z.int().positive()
    })
    .nullable()
    .optional(),
  theme: profileThemeSchema.optional()
});

export const updatePreferencesSchema = z.object({
  isPrivate: z.boolean().optional(),
  /** Validado contra a lista de fusos do runtime: string livre aqui
   *  quebraria o calculo de watched_on e, com ele, o streak. */
  timezone: z.string().max(50).optional(),
  ratingScale: ratingScaleSchema.optional(),
  spoilerMode: spoilerModeSchema.optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema
});

export const deleteAccountSchema = z.object({
  /** Digitar o proprio username e a barreira. Botao sozinho ja foi clicado
   *  por engano em todo produto que existe. */
  confirmation: z.string()
});

export const presetAvatarSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string(),
  category: z.string().nullable()
});

export const sessionInfoSchema = z.object({
  id: z.string(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  lastSeenAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  isCurrent: z.boolean()
});

export type Settings = z.infer<typeof settingsSchema>;
export type PresetAvatar = z.infer<typeof presetAvatarSchema>;
export type SessionInfo = z.infer<typeof sessionInfoSchema>;