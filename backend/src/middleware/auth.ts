import { Response, NextFunction } from "express";
import { Request } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin, getSupabaseUserClient, supabaseAnon } from "../config/supabase.js";
import { sendError } from "../utils/response.js";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
  };
  supabase?: SupabaseClient;
  token?: string;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, "Access token is required", 401);
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    // 1. Verify token with Supabase Auth
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      sendError(res, "Invalid or expired token", 401);
      return;
    }

    // 2. Fetch user role and profile from the database users table using supabaseAdmin
    const { data: profile, error: dbError } = await supabaseAdmin
      .from("users")
      .select("role, email, fullname")
      .eq("id", user.id)
      .single();

    if (dbError || !profile) {
      // Fallback defaults if profile not created yet or matches guest metadata
      req.user = {
        id: user.id,
        email: user.email || "",
        role: (user.user_metadata?.role as any) || "STUDENT",
      };
    } else {
      req.user = {
        id: user.id,
        email: profile.email,
        role: profile.role as "STUDENT" | "ADMIN" | "SUPER_ADMIN",
      };
    }

    // 3. Attach the request-scoped Supabase client for RLS queries
    req.supabase = getSupabaseUserClient(token);
    req.token = token;

    next();
  } catch (error: any) {
    sendError(res, "Authentication failed: " + error.message, 401);
  }
}

export async function authenticateOptional(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const guestId = req.headers["x-guest-id"] as string;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // No token provided, proceed as guest
    req.supabase = supabaseAnon;
    if (guestId) {
      req.user = {
        id: guestId,
        email: "",
        role: "STUDENT",
      };
    }
    next();
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    // 1. Verify token with Supabase Auth
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      sendError(res, "Invalid or expired token", 401);
      return;
    }

    // 2. Fetch user role and profile from the database users table using supabaseAdmin
    const { data: profile, error: dbError } = await supabaseAdmin
      .from("users")
      .select("role, email, fullname")
      .eq("id", user.id)
      .single();

    if (dbError || !profile) {
      // Fallback defaults if profile not created yet or matches guest metadata
      req.user = {
        id: user.id,
        email: user.email || "",
        role: (user.user_metadata?.role as any) || "STUDENT",
      };
    } else {
      req.user = {
        id: user.id,
        email: profile.email,
        role: profile.role as "STUDENT" | "ADMIN" | "SUPER_ADMIN",
      };
    }

    // 3. Attach the request-scoped Supabase client for RLS queries
    req.supabase = getSupabaseUserClient(token);
    req.token = token;

    next();
  } catch (error: any) {
    sendError(res, "Authentication failed: " + error.message, 401);
  }
}

