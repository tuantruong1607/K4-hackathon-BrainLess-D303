import prisma from "../config/database.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import type { RegisterInput, LoginInput, AdminLoginInput } from "../validators/auth.validator.js";

export class AuthService {
  async register(data: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw Object.assign(new Error("Email already registered"), {
        statusCode: 409,
      });
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullname: data.fullname,
      },
      select: {
        id: true,
        email: true,
        fullname: true,
        role: true,
        level: true,
        createdAt: true,
      },
    });

    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = signRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, accessToken, refreshToken };
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw Object.assign(new Error("Invalid email or password"), {
        statusCode: 401,
      });
    }

    if (user.isBanned) {
      throw Object.assign(new Error("Your account has been banned"), {
        statusCode: 403,
      });
    }

    const isValid = await comparePassword(data.password, user.passwordHash);

    if (!isValid) {
      throw Object.assign(new Error("Invalid email or password"), {
        statusCode: 401,
      });
    }

    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = signRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        level: user.level,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  async adminLogin(data: AdminLoginInput) {
    const admin = await prisma.admin.findUnique({
      where: { email: data.email },
    });

    if (!admin) {
      throw Object.assign(new Error("Invalid email or password"), {
        statusCode: 401,
      });
    }

    const isValid = await comparePassword(data.password, admin.passwordHash);

    if (!isValid) {
      throw Object.assign(new Error("Invalid email or password"), {
        statusCode: 401,
      });
    }

    const accessToken = signAccessToken({
      id: admin.id,
      email: admin.email,
      role: "ADMIN",
    });

    const refreshToken = signRefreshToken({
      id: admin.id,
      email: admin.email,
      role: "ADMIN",
    });

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        createdAt: admin.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  async getProfile(userId: string, role: string) {
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      const admin = await prisma.admin.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      if (!admin) {
        throw Object.assign(new Error("Admin not found"), { statusCode: 404 });
      }

      return { ...admin, role: "ADMIN" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullname: true,
        role: true,
        level: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw Object.assign(new Error("User not found"), { statusCode: 404 });
    }

    return user;
  }
}

export const authService = new AuthService();
