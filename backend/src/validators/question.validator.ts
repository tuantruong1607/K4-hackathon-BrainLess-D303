import { z } from "zod";

export const createQuestionSchema = z.object({
  quizId: z.string().uuid("Invalid quiz ID"),
  question: z.string().min(1, "Question is required"),
  optionA: z.string().min(1, "Option A is required"),
  optionB: z.string().min(1, "Option B is required"),
  optionC: z.string().min(1, "Option C is required"),
  optionD: z.string().min(1, "Option D is required"),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  knowledgeNode: z.string().optional().nullable(),
});

export const updateQuestionSchema = z.object({
  question: z.string().min(1).optional(),
  optionA: z.string().min(1).optional(),
  optionB: z.string().min(1).optional(),
  optionC: z.string().min(1).optional(),
  optionD: z.string().min(1).optional(),
  correctAnswer: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  knowledgeNode: z.string().optional().nullable(),
});

export const importQuestionsSchema = z.object({
  quizId: z.string().uuid("Invalid quiz ID"),
  questions: z.array(
    z.object({
      question: z.string().min(1),
      optionA: z.string().min(1),
      optionB: z.string().min(1),
      optionC: z.string().min(1),
      optionD: z.string().min(1),
      correctAnswer: z.string().min(1),
      difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
      knowledgeNode: z.string().optional().nullable(),
    })
  ),
});

export const generateQuestionsSchema = z.object({
  quizId: z.string().uuid("Invalid quiz ID"),
  day: z.string().min(1, "Day is required"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  count: z.number().int().positive().max(50).default(10),
});

export const questionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  quizId: z.string().uuid().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type ImportQuestionsInput = z.infer<typeof importQuestionsSchema>;
export type GenerateQuestionsInput = z.infer<typeof generateQuestionsSchema>;
export type QuestionQueryInput = z.infer<typeof questionQuerySchema>;
