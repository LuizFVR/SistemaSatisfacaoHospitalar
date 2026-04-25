import { z } from 'zod';

const jsonPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([jsonPrimitiveSchema, z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)]),
);

export const createFormularioSchema = z.object({
  nome: z.string().trim().min(3).max(120),
  descricao: z.string().trim().max(500).optional(),
});

export const updateFormularioSchema = z.object({
  nome: z.string().trim().min(3).max(120),
  descricao: z.string().trim().max(500).optional(),
});

export const createFormularioVersaoSchema = z.object({
  estruturaJson: jsonValueSchema,
});

export type CreateFormularioInput = z.infer<typeof createFormularioSchema>;
export type UpdateFormularioInput = z.infer<typeof updateFormularioSchema>;
export type CreateFormularioVersaoInput = z.infer<typeof createFormularioVersaoSchema>;
