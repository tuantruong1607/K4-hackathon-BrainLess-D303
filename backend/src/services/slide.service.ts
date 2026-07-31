import prisma from "../config/database.js";
import path from "path";
import fs from "fs/promises";
import { env } from "../config/env.js";

export class SlideService {
  async findAll() {
    return prisma.slideDocument.findMany({
      orderBy: { day: "asc" },
    });
  }

  async findByDay(day: string) {
    return prisma.slideDocument.findMany({
      where: { day },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: {
    day: string;
    title: string;
    pdfPath: string;
    previewPath?: string;
  }) {
    return prisma.slideDocument.create({ data });
  }

  async update(
    id: string,
    data: { day?: string; title?: string; previewPath?: string }
  ) {
    return prisma.slideDocument.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const slide = await prisma.slideDocument.findUnique({ where: { id } });

    if (!slide) {
      throw Object.assign(new Error("Slide not found"), { statusCode: 404 });
    }

    // Delete file from disk
    try {
      const fullPath = path.resolve(env.UPLOAD_DIR, slide.pdfPath);
      await fs.unlink(fullPath);
    } catch {
      // File may already be deleted, continue
    }

    if (slide.previewPath) {
      try {
        const previewFullPath = path.resolve(env.UPLOAD_DIR, slide.previewPath);
        await fs.unlink(previewFullPath);
      } catch {
        // Continue
      }
    }

    await prisma.slideDocument.delete({ where: { id } });
  }
}

export const slideService = new SlideService();
