import { z } from "zod";

export const updateProgressSchema = z.object({
  day: z.string().min(1, "Day is required"),
  slidePage: z.number().int().nonnegative().optional(),
  completed: z.boolean().optional(),
});

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
