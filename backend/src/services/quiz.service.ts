import { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../config/supabase.js";
import type {
  CreateQuizInput,
  UpdateQuizInput,
  ScheduleQuizInput,
  SubmitQuizInput,
  QuizQueryInput,
} from "../validators/quiz.validator.js";

export class QuizService {
  async findAll(supabase: SupabaseClient, query: QuizQueryInput) {
    const { page, limit, search, day, difficulty, isActive } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let dbQuery = supabase
      .from("quizzes")
      .select(`
        id, title, day, difficulty, is_active, start_time, end_time, created_by, created_at,
        questions:quiz_questions(count),
        results:quiz_results(count)
      `, { count: "exact" });

    if (search) {
      dbQuery = dbQuery.ilike("title", `%${search}%`);
    }
    if (day) {
      dbQuery = dbQuery.eq("day", day);
    }
    if (difficulty) {
      dbQuery = dbQuery.eq("difficulty", difficulty);
    }
    if (isActive !== undefined) {
      dbQuery = dbQuery.eq("is_active", isActive);
    }

    const { data: quizzes, count, error } = await dbQuery
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    // Format response to match original schema shape
    const formatted = (quizzes || []).map((q: any) => ({
      id: q.id,
      title: q.title,
      day: q.day,
      difficulty: q.difficulty,
      isActive: q.is_active,
      startTime: q.start_time,
      endTime: q.end_time,
      createdBy: q.created_by,
      createdAt: q.created_at,
      _count: {
        questions: q.questions?.[0]?.count || 0,
        results: q.results?.[0]?.count || 0,
      },
    }));

    return { quizzes: formatted, total: count || 0, page, limit };
  }

  async findById(supabase: SupabaseClient, id: string) {
    const { data: quiz, error } = await supabase
      .from("quizzes")
      .select(`
        id, title, day, difficulty, is_active, start_time, end_time, created_by, created_at,
        questions:quiz_questions(
          id, quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, difficulty, knowledge_node
        ),
        results:quiz_results(count)
      `)
      .eq("id", id)
      .single();

    if (error || !quiz) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    // Format questions
    const questions = (quiz.questions || []).map((q: any) => ({
      id: q.id,
      quizId: q.quiz_id,
      question: q.question,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      correctAnswer: q.correct_answer,
      difficulty: q.difficulty,
      knowledgeNode: q.knowledge_node,
    }));

    return {
      id: quiz.id,
      title: quiz.title,
      day: quiz.day,
      difficulty: quiz.difficulty,
      isActive: quiz.is_active,
      startTime: quiz.start_time,
      endTime: quiz.end_time,
      createdBy: quiz.created_by,
      createdAt: quiz.created_at,
      questions,
      _count: {
        results: quiz.results?.[0]?.count || 0,
      },
    };
  }

  async findByIdForStudent(supabase: SupabaseClient, id: string) {
    const { data: quiz, error } = await supabase
      .from("quizzes")
      .select(`
        id, title, day, difficulty, is_active, start_time, end_time, created_by,
        questions:quiz_questions(
          id, question, option_a, option_b, option_c, option_d, difficulty
        )
      `)
      .eq("id", id)
      .single();

    if (error || !quiz) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    if (!quiz.is_active) {
      throw Object.assign(new Error("Quiz is not currently active"), {
        statusCode: 403,
      });
    }

    // Format questions (omits correct_answer)
    const questions = (quiz.questions || []).map((q: any) => ({
      id: q.id,
      question: q.question,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      difficulty: q.difficulty,
    }));

    return {
      id: quiz.id,
      title: quiz.title,
      day: quiz.day,
      difficulty: quiz.difficulty,
      isActive: quiz.is_active,
      startTime: quiz.start_time,
      endTime: quiz.end_time,
      createdBy: quiz.created_by,
      questions,
    };
  }

  async create(supabase: SupabaseClient, data: CreateQuizInput, adminId: string) {
    const { data: quiz, error } = await supabase
      .from("quizzes")
      .insert({
        title: data.title,
        day: data.day,
        difficulty: data.difficulty,
        start_time: data.startTime ? new Date(data.startTime).toISOString() : null,
        end_time: data.endTime ? new Date(data.endTime).toISOString() : null,
        created_by: adminId,
      })
      .select()
      .single();

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    return {
      id: quiz.id,
      title: quiz.title,
      day: quiz.day,
      difficulty: quiz.difficulty,
      isActive: quiz.is_active,
      startTime: quiz.start_time,
      endTime: quiz.end_time,
      createdBy: quiz.created_by,
      createdAt: quiz.created_at,
    };
  }

  async update(supabase: SupabaseClient, id: string, data: UpdateQuizInput) {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.day !== undefined) updateData.day = data.day;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    if (data.startTime !== undefined) {
      updateData.start_time = data.startTime ? new Date(data.startTime).toISOString() : null;
    }
    if (data.endTime !== undefined) {
      updateData.end_time = data.endTime ? new Date(data.endTime).toISOString() : null;
    }

    const { data: quiz, error } = await supabase
      .from("quizzes")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    return {
      id: quiz.id,
      title: quiz.title,
      day: quiz.day,
      difficulty: quiz.difficulty,
      isActive: quiz.is_active,
      startTime: quiz.start_time,
      endTime: quiz.end_time,
      createdBy: quiz.created_by,
      createdAt: quiz.created_at,
    };
  }

  async delete(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }
  }

  async activate(supabase: SupabaseClient, id: string) {
    const { data: quiz, error } = await supabase
      .from("quizzes")
      .update({ is_active: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    return quiz;
  }

  async deactivate(supabase: SupabaseClient, id: string) {
    const { data: quiz, error } = await supabase
      .from("quizzes")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    return quiz;
  }

  async schedule(supabase: SupabaseClient, id: string, data: ScheduleQuizInput) {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw Object.assign(new Error("Invalid date format"), { statusCode: 400 });
    }

    if (endTime <= startTime) {
      throw Object.assign(new Error("End time must be after start time"), { statusCode: 400 });
    }

    const { data: quiz, error } = await supabase
      .from("quizzes")
      .update({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    return quiz;
  }

  async submit(supabase: SupabaseClient, userId: string, data: SubmitQuizInput) {
    // 1. Fetch the quiz and correct answers using supabaseAdmin (bypassing RLS because students can't view correct_answer)
    const { data: quiz, error: fetchError } = await supabaseAdmin
      .from("quizzes")
      .select(`
        id, is_active, start_time, end_time,
        questions:quiz_questions(id, correct_answer)
      `)
      .eq("id", data.quizId)
      .single();

    if (fetchError || !quiz) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    if (!quiz.is_active) {
      throw Object.assign(new Error("Quiz is not active"), { statusCode: 400 });
    }

    const now = new Date();
    if (quiz.start_time && now < new Date(quiz.start_time)) {
      throw Object.assign(new Error("Quiz has not started yet"), { statusCode: 400 });
    }
    if (quiz.end_time && now > new Date(quiz.end_time)) {
      throw Object.assign(new Error("Quiz has ended"), { statusCode: 400 });
    }

    // Check if user has already submitted a result using RLS client
    const { data: existingResults } = await supabase
      .from("quiz_results")
      .select("id")
      .eq("quiz_id", data.quizId);

    if (existingResults && existingResults.length > 0) {
      throw Object.assign(new Error("Quiz already submitted"), { statusCode: 409 });
    }

    // 2. Grade quiz answers
    let correctCount = 0;
    const questionMap = new Map((quiz.questions || []).map((q: any) => [q.id, q.correct_answer]));

    for (const answer of data.answers) {
      const correct = questionMap.get(answer.questionId);
      if (correct !== undefined && correct === answer.selectedAnswer) {
        correctCount++;
      }
    }

    const totalQuestions = quiz.questions?.length || 0;
    const wrongCount = totalQuestions - correctCount;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // 3. Save result under student's own RLS client context
    const { data: result, error: insertError } = await supabase
      .from("quiz_results")
      .insert({
        user_id: userId,
        quiz_id: data.quizId,
        score,
        correct_answers: correctCount,
        wrong_answers: wrongCount,
        time_spent: data.timeSpent,
      })
      .select()
      .single();

    if (insertError) {
      throw Object.assign(new Error(insertError.message), { statusCode: 400 });
    }

    return {
      id: result.id,
      userId: result.user_id,
      quizId: result.quiz_id,
      score: result.score,
      correctAnswers: result.correct_answers,
      wrongAnswers: result.wrong_answers,
      timeSpent: result.time_spent,
      createdAt: result.created_at,
    };
  }
}

export const quizService = new QuizService();
