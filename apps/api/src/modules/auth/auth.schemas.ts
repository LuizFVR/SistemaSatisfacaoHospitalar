import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email(),
  senha: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
