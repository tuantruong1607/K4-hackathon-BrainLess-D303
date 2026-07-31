import { SupabaseClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs/promises";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";

export class SlideService {
  async findAll(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from("slide_documents")
      .select("id, day, title, pdf_path, preview_path, created_at")
      .order("day", { ascending: true });

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      day: item.day,
      title: item.title,
      pdfPath: item.pdf_path,
      previewPath: item.preview_path,
      createdAt: item.created_at,
    }));
  }

  async findByDay(supabase: SupabaseClient, day: string) {
    const { data, error } = await supabase
      .from("slide_documents")
      .select("id, day, title, pdf_path, preview_path, created_at")
      .eq("day", day)
      .order("created_at", { ascending: false });

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      day: item.day,
      title: item.title,
      pdfPath: item.pdf_path,
      previewPath: item.preview_path,
      createdAt: item.created_at,
    }));
  }

  async create(data: {
    day: string;
    title: string;
    pdfPath: string;
    previewPath?: string;
  }) {
    const { data: slide, error } = await supabaseAdmin
      .from("slide_documents")
      .insert({
        day: data.day,
        title: data.title,
        pdf_path: data.pdfPath,
        preview_path: data.previewPath || null,
      })
      .select()
      .single();

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    return {
      id: slide.id,
      day: slide.day,
      title: slide.title,
      pdfPath: slide.pdf_path,
      previewPath: slide.preview_path,
      createdAt: slide.created_at,
    };
  }

  async update(
    id: string,
    data: { day?: string; title?: string; previewPath?: string }
  ) {
    const updateData: any = {};
    if (data.day !== undefined) updateData.day = data.day;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.previewPath !== undefined) updateData.preview_path = data.previewPath;

    const { data: slide, error } = await supabaseAdmin
      .from("slide_documents")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    return {
      id: slide.id,
      day: slide.day,
      title: slide.title,
      pdfPath: slide.pdf_path,
      previewPath: slide.preview_path,
      createdAt: slide.created_at,
    };
  }

  async delete(id: string) {
    const { data: slide, error: fetchError } = await supabaseAdmin
      .from("slide_documents")
      .select("id, pdf_path, preview_path")
      .eq("id", id)
      .single();

    if (fetchError || !slide) {
      throw Object.assign(new Error("Slide not found"), { statusCode: 404 });
    }

    // Delete file from disk
    try {
      const fullPath = path.resolve(env.UPLOAD_DIR, slide.pdf_path);
      await fs.unlink(fullPath);
    } catch {
      // Continue
    }

    if (slide.preview_path) {
      try {
        const previewFullPath = path.resolve(env.UPLOAD_DIR, slide.preview_path);
        await fs.unlink(previewFullPath);
      } catch {
        // Continue
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from("slide_documents")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw Object.assign(new Error(deleteError.message), { statusCode: 400 });
    }
  }
}

export const slideService = new SlideService();
