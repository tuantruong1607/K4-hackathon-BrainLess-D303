import { Request, Response, NextFunction } from "express";
import { quizService } from "../services/quiz.service.js";
import { sendSuccess, sendPaginated } from "../utils/response.js";
import { AuthRequest } from "../middleware/auth.js";

export class QuizController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { quizzes, total, page, limit } = await quizService.findAll(
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
        ? await quizService.findById(id)
        : await quizService.findByIdForStudent(id);

      sendSuccess(res, quiz, "Quiz retrieved");
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const quiz = await quizService.create(req.body, req.user!.id);
      sendSuccess(res, quiz, "Quiz created", 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const quiz = await quizService.update(req.params.id as string, req.body);
      sendSuccess(res, quiz, "Quiz updated");
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await quizService.delete(req.params.id as string);
      sendSuccess(res, null, "Quiz deleted");
    } catch (error) {
      next(error);
    }
  }

  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const quiz = await quizService.activate(req.params.id as string);
      sendSuccess(res, quiz, "Quiz activated");
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const quiz = await quizService.deactivate(req.params.id as string);
      sendSuccess(res, quiz, "Quiz deactivated");
    } catch (error) {
      next(error);
    }
  }

  async schedule(req: Request, res: Response, next: NextFunction) {
    try {
      const quiz = await quizService.schedule(req.params.id as string, req.body);
      sendSuccess(res, quiz, "Quiz scheduled");
    } catch (error) {
      next(error);
    }
  }

  async submit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await quizService.submit(req.user!.id, req.body);
      sendSuccess(res, result, "Quiz submitted", 201);
    } catch (error) {
      next(error);
    }
  }
}

export const quizController = new QuizController();
