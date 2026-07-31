import { supabaseAdmin } from "../config/supabase.js";
import type { RegisterInput, LoginInput, AdminLoginInput } from "../validators/auth.validator.js";

export class AuthService {
  async register(data: RegisterInput) {
    // 1. Sign up user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          fullname: data.fullname,
          role: "STUDENT",
        },
      },
    });

    if (authError || !authData.user) {
      throw Object.assign(new Error(authError?.message || "Registration failed"), {
        statusCode: 400,
      });
    }

    // 2. Create the user profile in the public.users database table
    const { data: userProfile, error: dbError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authData.user.id,
        email: data.email,
        password_hash: "", // Password managed securely by Supabase Auth
        fullname: data.fullname,
        role: "STUDENT",
        level: "BEGINNER",
      })
      .select()
      .single();

    if (dbError) {
      // Clean up Supabase Auth user if db insert fails to keep in sync
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw Object.assign(new Error(dbError.message || "Failed to create user profile"), {
        statusCode: 500,
      });
    }

    return {
      user: {
        id: userProfile.id,
        email: userProfile.email,
        fullname: userProfile.fullname,
        role: userProfile.role,
        level: userProfile.level,
        createdAt: userProfile.created_at,
      },
      accessToken: authData.session?.access_token || "",
      refreshToken: authData.session?.refresh_token || "",
    };
  }

  async login(data: LoginInput) {
    // 1. Sign in with password via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError || !authData.user || !authData.session) {
      throw Object.assign(new Error("Invalid email or password"), {
        statusCode: 401,
      });
    }

    // 2. Fetch the user profile and check ban status
    const { data: userProfile, error: dbError } = await supabaseAdmin
      .from("users")
      .select("id, email, fullname, role, level, is_banned, created_at")
      .eq("id", authData.user.id)
      .single();

    if (dbError || !userProfile) {
      throw Object.assign(new Error("User profile not found"), {
        statusCode: 404,
      });
    }

    if (userProfile.is_banned) {
      throw Object.assign(new Error("Your account has been banned"), {
        statusCode: 403,
      });
    }

    return {
      user: {
        id: userProfile.id,
        email: userProfile.email,
        fullname: userProfile.fullname,
        role: userProfile.role,
        level: userProfile.level,
        createdAt: userProfile.created_at,
      },
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
    };
  }

  async adminLogin(data: AdminLoginInput) {
    // 1. Sign in with password via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError || !authData.user || !authData.session) {
      throw Object.assign(new Error("Invalid email or password"), {
        statusCode: 401,
      });
    }

    // 2. Fetch the user profile and check admin permissions
    const { data: userProfile, error: dbError } = await supabaseAdmin
      .from("users")
      .select("id, email, fullname, role, level, created_at")
      .eq("id", authData.user.id)
      .single();

    if (dbError || !userProfile || userProfile.role !== "ADMIN") {
      throw Object.assign(new Error("Unauthorized admin access"), {
        statusCode: 403,
      });
    }

    return {
      admin: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.fullname,
        createdAt: userProfile.created_at,
      },
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
    };
  }

  async getProfile(userId: string, role: string) {
    const { data: userProfile, error } = await supabaseAdmin
      .from("users")
      .select("id, email, fullname, role, level, created_at")
      .eq("id", userId)
      .single();

    if (error || !userProfile) {
      throw Object.assign(new Error("User profile not found"), { statusCode: 404 });
    }

    return {
      id: userProfile.id,
      email: userProfile.email,
      fullname: userProfile.fullname,
      role: userProfile.role,
      level: userProfile.level,
      createdAt: userProfile.created_at,
    };
  }
}

export const authService = new AuthService();
