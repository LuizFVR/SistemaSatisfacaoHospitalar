import { StatusAlerta } from '@prisma/client';
import { z } from 'zod';

export const listarAlertasFiltroSchema = z.object({
  sentorId: z.string().trim().min(1).optional(),
  status: z.nativeEnum(StatusAlerta).optional(),
  de: z
    .string()
    .datetime({ offset: true })
    .or(z.string().datetime())
    .optional(),
  ate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().datetime())
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type ListarAlertasFiltroInput = z.infer<typeof listarAlertasFiltroSchema>;
