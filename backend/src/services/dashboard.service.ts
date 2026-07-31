import { supabaseAdmin } from "../config/supabase.js";

export class DashboardService {
  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      { count: totalUsers },
      { data: todayActiveUsers },
      { count: totalQuizzes },
      { data: scores },
      { count: totalQuestions },
    ] = await Promise.all([
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("learning_progress").select("user_id").gte("last_access", today.toISOString()),
      supabaseAdmin.from("quizzes").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("quiz_results").select("score"),
      supabaseAdmin.from("quiz_questions").select("*", { count: "exact", head: true }),
    ]);

    const activeUserCount = new Set((todayActiveUsers || []).map((item: any) => item.user_id)).size;

    const avgScore = scores && scores.length > 0
      ? scores.reduce((acc: number, curr: any) => acc + curr.score, 0) / scores.length
      : null;

    return {
      totalUsers: totalUsers || 0,
      todayActive: activeUserCount,
      totalQuizzes: totalQuizzes || 0,
      totalQuestions: totalQuestions || 0,
      averageScore: avgScore !== null ? Math.round(avgScore) : null,
    };
  }

  async getProgressOverview() {
    const { data: progressList, error } = await supabaseAdmin
      .from("learning_progress")
      .select("day, slide_page, completed, user_id");

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    // Group progress by day in memory
    const dayGroups = new Map<string, { totalLearners: Set<string>; sumSlidePage: number; completedCount: number }>();

    for (const item of (progressList || [])) {
      if (!dayGroups.has(item.day)) {
        dayGroups.set(item.day, {
          totalLearners: new Set(),
          sumSlidePage: 0,
          completedCount: 0,
        });
      }
      const group = dayGroups.get(item.day)!;
      group.totalLearners.add(item.user_id);
      group.sumSlidePage += item.slide_page || 0;
      if (item.completed) {
        group.completedCount += 1;
      }
    }

    return Array.from(dayGroups.entries()).map(([day, stats]) => {
      const learnersCount = stats.totalLearners.size;
      const avgPage = learnersCount > 0 ? Math.round(stats.sumSlidePage / learnersCount) : 0;
      return {
        day,
        totalLearners: learnersCount,
        averageSlidePage: avgPage,
        completedCount: stats.completedCount,
      };
    });
  }

  async getQuizResultsAnalytics() {
    const [
      { data: results, error: resultsError },
      { data: quizzes, error: quizzesError }
    ] = await Promise.all([
      supabaseAdmin.from("quiz_results").select("id, quiz_id, score"),
      supabaseAdmin.from("quizzes").select("id, title, day"),
    ]);

    if (resultsError || quizzesError) {
      throw Object.assign(new Error(resultsError?.message || quizzesError?.message), { statusCode: 400 });
    }

    if (!results || results.length === 0) {
      return [];
    }

    const quizMap = new Map((quizzes || []).map((q: any) => [q.id, q]));

    // Group in memory
    const quizGroups = new Map<string, { scores: number[]; quizId: string }>();

    for (const res of results) {
      if (!quizGroups.has(res.quiz_id)) {
        quizGroups.set(res.quiz_id, { scores: [], quizId: res.quiz_id });
      }
      quizGroups.get(res.quiz_id)!.scores.push(res.score);
    }

    return Array.from(quizGroups.values()).map((group) => {
      const quiz = quizMap.get(group.quizId);
      const totalSubmissions = group.scores.length;
      const sum = group.scores.reduce((a, b) => a + b, 0);
      const averageScore = totalSubmissions > 0 ? Math.round(sum / totalSubmissions) : 0;
      const minScore = Math.min(...group.scores);
      const maxScore = Math.max(...group.scores);

      return {
        quizId: group.quizId,
        quizTitle: quiz?.title ?? "Unknown",
        day: quiz?.day ?? "Unknown",
        totalSubmissions,
        averageScore,
        minScore,
        maxScore,
      };
    });
  }
}

export const dashboardService = new DashboardService();
