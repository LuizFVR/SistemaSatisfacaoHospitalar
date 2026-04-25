import { z } from 'zod';

export const createSentorSchema = z.object({
  nome: z.string().trim().min(3).max(120),
  codigo: z.string().trim().min(1).max(40).optional(),
  localizacao: z.string().trim().min(1).max(200).optional(),
});

export const updateSentorSchema = z.object({
  nome: z.string().trim().min(3).max(120),
  codigo: z.string().trim().min(1).max(40).optional(),
  localizacao: z.string().trim().min(1).max(200).optional(),
});

export const updateSentorStatusSchema = z.object({
  ativo: z.boolean(),
});

export type CreateSentorInput = z.infer<typeof createSentorSchema>;
export type UpdateSentorInput = z.infer<typeof updateSentorSchema>;
export type UpdateSentorStatusInput = z.infer<typeof updateSentorStatusSchema>;
