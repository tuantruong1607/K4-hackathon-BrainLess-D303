import prisma from "../config/database.js";
import { agentService } from "./agent.service.js";
import type {
  CreateQuestionInput,
  UpdateQuestionInput,
  ImportQuestionsInput,
  GenerateQuestionsInput,
  QuestionQueryInput,
} from "../validators/question.validator.js";

export class QuestionService {
  async findAll(query: QuestionQueryInput) {
    const { page, limit, quizId, difficulty } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (quizId) where.quizId = quizId;
    if (difficulty) where.difficulty = difficulty;

    const [questions, total] = await Promise.all([
      prisma.quizQuestion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { question: "asc" },
        include: {
          quiz: { select: { id: true, title: true } },
        },
      }),
      prisma.quizQuestion.count({ where }),
    ]);

    return { questions, total, page, limit };
  }

  async create(data: CreateQuestionInput) {
    // Verify quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: data.quizId },
    });

    if (!quiz) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    return prisma.quizQuestion.create({ data });
  }

  async update(id: string, data: UpdateQuestionInput) {
    // Check question exists first for a clear error message
    const existing = await prisma.quizQuestion.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error("Question not found"), { statusCode: 404 });
    }

    return prisma.quizQuestion.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const existing = await prisma.quizQuestion.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error("Question not found"), { statusCode: 404 });
    }

    await prisma.quizQuestion.delete({ where: { id } });
  }

  async importQuestions(data: ImportQuestionsInput) {
    // Verify quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: data.quizId },
    });

    if (!quiz) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    if (data.questions.length === 0) {
      return { count: 0 };
    }

    const result = await prisma.quizQuestion.createMany({
      data: data.questions.map((q) => ({
        quizId: data.quizId,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty,
        knowledgeNode: q.knowledgeNode ?? null,
      })),
    });

    return { count: result.count };
  }

  async exportQuestions(quizId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    return {
      quiz: { id: quiz.id, title: quiz.title, day: quiz.day },
      questions: quiz.questions.map((q) => ({
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty,
        knowledgeNode: q.knowledgeNode,
      })),
    };
  }

  async generateFromAI(data: GenerateQuestionsInput) {
    // Verify quiz exists before calling Agent
    const quiz = await prisma.quiz.findUnique({
      where: { id: data.quizId },
    });

    if (!quiz) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    // Call Agent service to generate questions
    const generated = await agentService.generateQuiz(
      data.day,
      data.difficulty.toLowerCase(),
      data.count
    );

    if (!generated.questions || !Array.isArray(generated.questions) || generated.questions.length === 0) {
      throw Object.assign(
        new Error("AI failed to generate questions"),
        { statusCode: 502 }
      );
    }

    // Save generated questions to the quiz
    const savedQuestions = await prisma.quizQuestion.createMany({
      data: generated.questions.map((q: any) => ({
        quizId: data.quizId,
        question: q.question || q.Question || "",
        optionA: q.optionA || q.option_a || q.options?.[0] || "",
        optionB: q.optionB || q.option_b || q.options?.[1] || "",
        optionC: q.optionC || q.option_c || q.options?.[2] || "",
        optionD: q.optionD || q.option_d || q.options?.[3] || "",
        correctAnswer: q.correctAnswer || q.correct_answer || q.answer || "",
        difficulty: data.difficulty,
        knowledgeNode: q.knowledgeNode || q.knowledge_node || null,
      })),
    });

    return { count: savedQuestions.count, questions: generated.questions };
  }
}

export const questionService = new QuestionService();
