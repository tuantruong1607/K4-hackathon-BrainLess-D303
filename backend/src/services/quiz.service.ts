import prisma from "../config/database.js";
import type {
  CreateQuizInput,
  UpdateQuizInput,
  ScheduleQuizInput,
  SubmitQuizInput,
  QuizQueryInput,
} from "../validators/quiz.validator.js";

export class QuizService {
  async findAll(query: QuizQueryInput) {
    const { page, limit, search, day, difficulty, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }
    if (day) where.day = day;
    if (difficulty) where.difficulty = difficulty;
    if (isActive !== undefined) where.isActive = isActive;

    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { questions: true, results: true } },
          creator: { select: { id: true, name: true } },
        },
      }),
      prisma.quiz.count({ where }),
    ]);

    return { quizzes, total, page, limit };
  }

  async findById(id: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: true,
        creator: { select: { id: true, name: true } },
        _count: { select: { results: true } },
      },
    });

    if (!quiz) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    return quiz;
  }

  async findByIdForStudent(id: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          select: {
            id: true,
            question: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
            difficulty: true,
            // correctAnswer is hidden from students
          },
        },
      },
    });

    if (!quiz) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    if (!quiz.isActive) {
      throw Object.assign(new Error("Quiz is not currently active"), {
        statusCode: 403,
      });
    }

    return quiz;
  }

  async create(data: CreateQuizInput, adminId: string) {
    // Verify admin exists
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw Object.assign(new Error("Admin not found"), { statusCode: 404 });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: data.title,
        day: data.day,
        difficulty: data.difficulty,
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
        createdBy: adminId,
      },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    return quiz;
  }

  async update(id: string, data: UpdateQuizInput) {
    // Check quiz exists first
    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    // Build update data explicitly — don't spread raw input to avoid
    // overwriting existing startTime/endTime with undefined
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.day !== undefined) updateData.day = data.day;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Handle nullable date fields: null means clear, string means set, undefined means keep
    if (data.startTime !== undefined) {
      updateData.startTime = data.startTime ? new Date(data.startTime) : null;
    }
    if (data.endTime !== undefined) {
      updateData.endTime = data.endTime ? new Date(data.endTime) : null;
    }

    const quiz = await prisma.quiz.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    return quiz;
  }

  async delete(id: string) {
    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    // Delete in correct order: questions first (CASCADE should handle this,
    // but being explicit is safer)
    await prisma.quiz.delete({ where: { id } });
  }

  async activate(id: string) {
    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    return prisma.quiz.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async deactivate(id: string) {
    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    return prisma.quiz.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async schedule(id: string, data: ScheduleQuizInput) {
    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw Object.assign(new Error("Invalid date format"), {
        statusCode: 400,
      });
    }

    if (endTime <= startTime) {
      throw Object.assign(new Error("End time must be after start time"), {
        statusCode: 400,
      });
    }

    return prisma.quiz.update({
      where: { id },
      data: { startTime, endTime },
    });
  }

  async submit(userId: string, data: SubmitQuizInput) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: data.quizId },
      include: { questions: true },
    });

    if (!quiz) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    if (!quiz.isActive) {
      throw Object.assign(new Error("Quiz is not active"), {
        statusCode: 400,
      });
    }

    // Check time constraints
    const now = new Date();
    if (quiz.startTime && now < quiz.startTime) {
      throw Object.assign(new Error("Quiz has not started yet"), {
        statusCode: 400,
      });
    }
    if (quiz.endTime && now > quiz.endTime) {
      throw Object.assign(new Error("Quiz has ended"), { statusCode: 400 });
    }

    // Check if already submitted
    const existingResult = await prisma.quizResult.findFirst({
      where: { userId, quizId: data.quizId },
    });

    if (existingResult) {
      throw Object.assign(new Error("Quiz already submitted"), {
        statusCode: 409,
      });
    }

    // Calculate score
    let correctCount = 0;
    const questionMap = new Map(
      quiz.questions.map((q) => [q.id, q.correctAnswer])
    );

    for (const answer of data.answers) {
      const correct = questionMap.get(answer.questionId);
      if (correct !== undefined && correct === answer.selectedAnswer) {
        correctCount++;
      }
    }

    // wrongCount based on total questions, not submitted answers count
    const totalQuestions = quiz.questions.length;
    const wrongCount = totalQuestions - correctCount;
    const score = totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

    const result = await prisma.quizResult.create({
      data: {
        userId,
        quizId: data.quizId,
        score,
        correctAnswers: correctCount,
        wrongAnswers: wrongCount,
        timeSpent: data.timeSpent,
      },
      include: {
        quiz: { select: { id: true, title: true, day: true } },
      },
    });

    return result;
  }
}

export const quizService = new QuizService();
