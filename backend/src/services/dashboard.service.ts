import prisma from "../config/database.js";

export class DashboardService {
  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      todayActiveUsers,
      totalQuizzes,
      avgScoreResult,
      totalQuestions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.learningProgress.findMany({
        where: { lastAccess: { gte: today } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.quiz.count(),
      prisma.quizResult.aggregate({
        _avg: { score: true },
      }),
      prisma.quizQuestion.count(),
    ]);

    // _avg.score is null when no results exist — use ?? instead of ||
    // so that a real score of 0 isn't replaced
    const avgScore = avgScoreResult._avg.score;

    return {
      totalUsers,
      todayActive: todayActiveUsers.length,
      totalQuizzes,
      totalQuestions,
      averageScore: avgScore !== null ? Math.round(avgScore) : null,
    };
  }

  async getProgressOverview() {
    const progress = await prisma.learningProgress.groupBy({
      by: ["day"],
      _count: { userId: true },
      _avg: { slidePage: true },
    });

    const completedByDay = await prisma.learningProgress.groupBy({
      by: ["day"],
      where: { completed: true },
      _count: { userId: true },
    });

    const completedMap = new Map(
      completedByDay.map((item) => [item.day, item._count.userId])
    );

    return progress.map((item) => {
      const avgPage = item._avg.slidePage;
      return {
        day: item.day,
        totalLearners: item._count.userId,
        averageSlidePage: avgPage !== null ? Math.round(avgPage) : 0,
        completedCount: completedMap.get(item.day) ?? 0,
      };
    });
  }

  async getQuizResultsAnalytics() {
    const results = await prisma.quizResult.groupBy({
      by: ["quizId"],
      _avg: { score: true },
      _count: { id: true },
      _min: { score: true },
      _max: { score: true },
    });

    if (results.length === 0) {
      return [];
    }

    // Get quiz titles
    const quizIds = results.map((r) => r.quizId);
    const quizzes = await prisma.quiz.findMany({
      where: { id: { in: quizIds } },
      select: { id: true, title: true, day: true },
    });

    const quizMap = new Map(quizzes.map((q) => [q.id, q]));

    return results.map((result) => {
      const quiz = quizMap.get(result.quizId);
      const avgScore = result._avg.score;
      return {
        quizId: result.quizId,
        quizTitle: quiz?.title ?? "Unknown",
        day: quiz?.day ?? "Unknown",
        totalSubmissions: result._count.id,
        averageScore: avgScore !== null ? Math.round(avgScore) : 0,
        minScore: result._min.score ?? 0,
        maxScore: result._max.score ?? 0,
        };
    });
  }
}

export const dashboardService = new DashboardService();
