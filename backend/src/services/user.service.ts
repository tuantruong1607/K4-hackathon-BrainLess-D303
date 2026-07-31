import { supabaseAdmin } from "../config/supabase.js";
import type {
  UpdateUserInput,
  UserQueryInput,
  ResetPasswordInput,
} from "../validators/user.validator.js";

export class UserService {
  async findAll(query: UserQueryInput) {
    const { page, limit, search, role, level } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let dbQuery = supabaseAdmin
      .from("users")
      .select("id, email, fullname, role, level, is_banned, created_at", { count: "exact" });

    if (search) {
      dbQuery = dbQuery.or(`fullname.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role) dbQuery = dbQuery.eq("role", role);
    if (level) dbQuery = dbQuery.eq("level", level);

    const { data: users, count, error } = await dbQuery
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    // Format fields to match original casing
    const formatted = (users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      fullname: u.fullname,
      role: u.role,
      level: u.level,
      isBanned: u.is_banned,
      createdAt: u.created_at,
    }));

    return { users: formatted, total: count || 0, page, limit };
  }

  async findById(id: string) {
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select(`
        id, email, fullname, role, level, is_banned, created_at,
        quiz_results(
          id, score, correct_answers, wrong_answers, time_spent, created_at,
          quiz:quizzes(id, title, day)
        ),
        learning_progress(
          id, day, slide_page, completed, last_access
        )
      `)
      .eq("id", id)
      .single();

    if (error || !user) {
      throw Object.assign(new Error("User not found"), { statusCode: 404 });
    }

    // Format quiz results
    const quizResults = (user.quiz_results || [])
      .slice(0, 10)
      .map((r: any) => ({
        id: r.id,
        score: r.score,
        correctAnswers: r.correct_answers,
        wrongAnswers: r.wrong_answers,
        timeSpent: r.time_spent,
        createdAt: r.created_at,
        quiz: r.quiz ? { id: r.quiz.id, title: r.quiz.title, day: r.quiz.day } : null,
      }));

    // Format learning progress
    const learningProgress = (user.learning_progress || []).map((p: any) => ({
      id: p.id,
      day: p.day,
      slidePage: p.slide_page,
      completed: p.completed,
      lastAccess: p.last_access,
    }));

    return {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      role: user.role,
      level: user.level,
      isBanned: user.is_banned,
      createdAt: user.created_at,
      quizResults,
      learningProgress,
    };
  }

  async update(id: string, data: UpdateUserInput) {
    const updateData: any = {};
    if (data.fullname !== undefined) updateData.fullname = data.fullname;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.level !== undefined) updateData.level = data.level;

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    // Update Supabase Auth user metadata too to keep in sync
    await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: { fullname: user.fullname, role: user.role },
    });

    return {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      role: user.role,
      level: user.level,
      isBanned: user.is_banned,
      createdAt: user.created_at,
    };
  }

  async delete(id: string) {
    // 1. Delete Supabase Auth user first
    await supabaseAdmin.auth.admin.deleteUser(id);

    // 2. Cascade will delete public.users profile, but being explicit is safer
    const { error } = await supabaseAdmin.from("users").delete().eq("id", id);
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }
  }

  async toggleBan(id: string) {
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("id, is_banned")
      .eq("id", id)
      .single();

    if (fetchError || !user) {
      throw Object.assign(new Error("User not found"), { statusCode: 404 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("users")
      .update({ is_banned: !user.is_banned })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw Object.assign(new Error(updateError.message), { statusCode: 400 });
    }

    // Toggle ban in Supabase Auth as well by locking/unlocking the user if needed
    // (Banned status is checked on our login flow, but we can also set ban metadata in auth)
    await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: !user.is_banned ? "1000h" : "none", // Banned for 1000h or clear ban
    });

    return {
      id: updated.id,
      email: updated.email,
      fullname: updated.fullname,
      isBanned: updated.is_banned,
    };
  }

  async resetPassword(id: string, data: ResetPasswordInput) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: data.newPassword,
    });

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }
  }
}

export const userService = new UserService();
