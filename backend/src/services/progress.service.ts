import prisma from "../config/database.js";
import type { UpdateProgressInput } from "../validators/progress.validator.js";

export class ProgressService {
  async getByUserId(userId: string) {
    return prisma.learningProgress.findMany({
      where: { userId },
      orderBy: { day: "asc" },
    });
  }

  async upsert(userId: string, data: UpdateProgressInput) {
    return prisma.learningProgress.upsert({
      where: {
        userId_day: { userId, day: data.day },
      },
      update: {
        slidePage: data.slidePage,
        completed: data.completed,
        lastAccess: new Date(),
      },
      create: {
        userId,
        day: data.day,
        slidePage: data.slidePage || 0,
        completed: data.completed || false,
      },
    });
  }
}

export const progressService = new ProgressService();
