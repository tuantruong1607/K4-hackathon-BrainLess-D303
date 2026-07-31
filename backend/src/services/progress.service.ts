import { SupabaseClient } from "@supabase/supabase-js";
import type { UpdateProgressInput } from "../validators/progress.validator.js";

export class ProgressService {
  async getByUserId(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from("learning_progress")
      .select("id, user_id, day, slide_page, completed, last_access")
      .order("day", { ascending: true });

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    // Map database snake_case structure to camelCase frontend expectations
    return (data || []).map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      day: item.day,
      slidePage: item.slide_page,
      completed: item.completed,
      lastAccess: item.last_access,
    }));
  }

  async upsert(supabase: SupabaseClient, userId: string, data: UpdateProgressInput) {
    const { data: result, error } = await supabase
      .from("learning_progress")
      .upsert(
        {
          user_id: userId,
          day: data.day,
          slide_page: data.slidePage || 0,
          completed: data.completed ?? false,
          last_access: new Date().toISOString(),
        },
        { onConflict: "user_id,day" }
      )
      .select()
      .single();

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    return {
      id: result.id,
      userId: result.user_id,
      day: result.day,
      slidePage: result.slide_page,
      completed: result.completed,
      lastAccess: result.last_access,
    };
  }
}

export const progressService = new ProgressService();
