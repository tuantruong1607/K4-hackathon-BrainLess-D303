import { Request, Response, NextFunction } from "express";
import { quizService } from "../services/quiz.service.js";
import { sendSuccess, sendPaginated } from "../utils/response.js";
import { AuthRequest } from "../middleware/auth.js";

export class QuizController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { quizzes, total, page, limit } = await quizService.findAll(
        req.supabase!,
        req.query as any
      );
      sendPaginated(res, quizzes, total, page, limit, "Quizzes retrieved");
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const isAdmin =
        req.user?.role === "ADMIN" || req.user?.role === "SUPER_ADMIN";

      const quiz = isAdmin
        ? await quizService.findById(req.supabase!, id)
        : await quizService.findByIdForStudent(req.supabase!, id);

      sendSuccess(res, quiz, "Quiz retrieved");
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const quiz = await quizService.create(req.supabase!, req.body, req.user!.id);
      sendSuccess(res, quiz, "Quiz created", 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const quiz = await quizService.update(req.supabase!, req.params.id as string, req.body);
      sendSuccess(res, quiz, "Quiz updated");
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await quizService.delete(req.supabase!, req.params.id as string);
      sendSuccess(res, null, "Quiz deleted");
    } catch (error) {
      next(error);
    }
  }

  async activate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const quiz = await quizService.activate(req.supabase!, req.params.id as string);
      sendSuccess(res, quiz, "Quiz activated");
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const quiz = await quizService.deactivate(req.supabase!, req.params.id as string);
      sendSuccess(res, quiz, "Quiz deactivated");
    } catch (error) {
      next(error);
    }
  }

  async schedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const quiz = await quizService.schedule(req.supabase!, req.params.id as string, req.body);
      sendSuccess(res, quiz, "Quiz scheduled");
    } catch (error) {
      next(error);
    }
  }

  async submit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await quizService.submit(req.supabase!, req.user!.id, req.body);
      sendSuccess(res, result, "Quiz submitted", 201);
    } catch (error) {
      next(error);
    }
  }
}

export const quizController = new QuizController();
