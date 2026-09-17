import { z } from 'zod';
import { badgeTierSchema } from './enums';

export const badgeStatusSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  iconName: z.string().nullable(),
  tier: badgeTierSchema,
  isSecret: z.boolean(),
  earnedAt: z.iso.datetime().nullable(),
  /** Null em badge secreta nao ganha: mostrar progresso entregaria o
   *  criterio. */
  current: z.number().nullable(),
  target: z.number().nullable()
});

export const badgeListSchema = z.object({
  items: z.array(badgeStatusSchema),
  earned: z.number(),
  total: z.number(),
  /** Concedidas e ainda nao vistas. A tela mostra o aviso e marca. */
  unseen: z.array(badgeStatusSchema)
});

export type BadgeStatus = z.infer<typeof badgeStatusSchema>;