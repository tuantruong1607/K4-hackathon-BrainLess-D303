import { z } from "zod";

export const createQuizSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  day: z.string().min(1, "Day is required"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  questions: z
    .array(
      z.object({
        question: z.string().min(1, "Question is required"),
        optionA: z.string().min(1, "Option A is required"),
        optionB: z.string().min(1, "Option B is required"),
        optionC: z.string().min(1, "Option C is required"),
        optionD: z.string().min(1, "Option D is required"),
        correctAnswer: z.enum(["A", "B", "C", "D"]),
        difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
        knowledgeNode: z.string().optional().nullable(),
      })
    )
    .max(100)
    .optional(),
});

export const updateQuizSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  day: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  isActive: z.boolean().optional(),
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
});

export const scheduleQuizSchema = z.object({
  startTime: z.string().datetime("Invalid start time"),
  endTime: z.string().datetime("Invalid end time"),
});

export const submitQuizSchema = z.object({
  quizId: z.string().uuid("Invalid quiz ID"),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedAnswer: z.string(),
    })
  ),
  timeSpent: z.number().int().nonnegative(),
});

export const quizQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  day: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
export type ScheduleQuizInput = z.infer<typeof scheduleQuizSchema>;
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;
export type QuizQueryInput = z.infer<typeof quizQuerySchema>;
