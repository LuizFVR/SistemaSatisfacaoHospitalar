import { Turno } from '@prisma/client';
import { z } from 'zod';

const dateStringSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime())
  .optional();

export const relatorioFiltroSchema = z.object({
  sentorId: z.string().trim().min(1).optional(),
  de: dateStringSchema,
  ate: dateStringSchema,
  turno: z.nativeEnum(Turno).optional(),
});

export const comparativoTurnosFiltroSchema = z.object({
  sentorId: z.string().trim().min(1),
  de: dateStringSchema,
  ate: dateStringSchema,
});

export type RelatorioFiltroInput = z.infer<typeof relatorioFiltroSchema>;
export type ComparativoTurnosFiltroInput = z.infer<typeof comparativoTurnosFiltroSchema>;
