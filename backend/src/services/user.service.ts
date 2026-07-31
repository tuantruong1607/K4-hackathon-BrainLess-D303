import prisma from "../config/database.js";
import { hashPassword } from "../utils/hash.js";
import type {
  UpdateUserInput,
  UserQueryInput,
  ResetPasswordInput,
} from "../validators/user.validator.js";

export class UserService {
  async findAll(query: UserQueryInput) {
    const { page, limit, search, role, level } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { fullname: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) where.role = role;
    if (level) where.level = level;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          fullname: true,
          role: true,
          level: true,
          isBanned: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullname: true,
        role: true,
        level: true,
        isBanned: true,
        createdAt: true,
        quizResults: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            score: true,
            correctAnswers: true,
            wrongAnswers: true,
            timeSpent: true,
            createdAt: true,
            quiz: { select: { id: true, title: true, day: true } },
          },
        },
        learningProgress: {
          orderBy: { lastAccess: "desc" },
          select: {
            id: true,
            day: true,
            slidePage: true,
            completed: true,
            lastAccess: true,
          },
        },
      },
    });

    if (!user) {
      throw Object.assign(new Error("User not found"), { statusCode: 404 });
    }

    return user;
  }

  async update(id: string, data: UpdateUserInput) {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        fullname: true,
        role: true,
        level: true,
        isBanned: true,
        createdAt: true,
      },
    });

    return user;
  }

  async delete(id: string) {
    await prisma.user.delete({ where: { id } });
  }

  async toggleBan(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw Object.assign(new Error("User not found"), { statusCode: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isBanned: !user.isBanned },
      select: {
        id: true,
        email: true,
        fullname: true,
        isBanned: true,
      },
    });

    return updated;
  }

  async resetPassword(id: string, data: ResetPasswordInput) {
    const passwordHash = await hashPassword(data.newPassword);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }
}

export const userService = new UserService();
