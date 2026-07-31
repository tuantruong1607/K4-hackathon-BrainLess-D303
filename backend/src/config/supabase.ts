import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase configuration in environment variables");
}

/**
 * Supabase client running with service_role permissions (bypasses RLS).
 * Use only for admin actions or registration/auth routing when client context isn't available.
 */
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Creates a request-scoped Supabase client using the client's own JWT token.
 * This ensures Row Level Security (RLS) is correctly enforced inside database queries.
 */
export function getSupabaseUserClient(jwtToken: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    },
  });
}

/**
 * Standard anonymous Supabase client.
 * For guests and public queries where RLS limits access but no JWT is present.
 */
export const supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

