import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service.js";
import { sendSuccess } from "../utils/response.js";
import { AuthRequest } from "../middleware/auth.js";

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      sendSuccess(res, result, "Registration successful", 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      sendSuccess(res, result, "Login successful");
    } catch (error) {
      next(error);
    }
  }

  async adminLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.adminLogin(req.body);
      sendSuccess(res, result, "Admin login successful");
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const profile = await authService.getProfile(
        req.user!.id,
        req.user!.role
      );
      sendSuccess(res, profile, "Profile retrieved");
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
