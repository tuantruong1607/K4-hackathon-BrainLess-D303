import { z } from "zod";

export const updateUserSchema = z.object({
  fullname: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  role: z.enum(["STUDENT", "ADMIN"]).optional(),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  role: z.enum(["STUDENT", "ADMIN"]).optional(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
