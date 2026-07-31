import { Request, Response, NextFunction } from "express";
import { questionService } from "../services/question.service.js";
import { sendSuccess, sendPaginated } from "../utils/response.js";

export class QuestionController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { questions, total, page, limit } =
        await questionService.findAll(req.query as any);
      sendPaginated(
        res,
        questions,
        total,
        page,
        limit,
        "Questions retrieved"
      );
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const question = await questionService.create(req.body);
      sendSuccess(res, question, "Question created", 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const question = await questionService.update(req.params.id as string, req.body);
      sendSuccess(res, question, "Question updated");
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await questionService.delete(req.params.id as string);
      sendSuccess(res, null, "Question deleted");
    } catch (error) {
      next(error);
    }
  }

  async importQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await questionService.importQuestions(req.body);
      sendSuccess(res, result, `Imported ${result.count} questions`, 201);
    } catch (error) {
      next(error);
    }
  }

  async exportQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await questionService.exportQuestions(req.params.quizId as string);
      sendSuccess(res, data, "Questions exported");
    } catch (error) {
      next(error);
    }
  }

  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await questionService.generateFromAI(req.body);
      sendSuccess(
        res,
        result,
        `Generated ${result.count} questions from AI`,
        201
      );
    } catch (error) {
      next(error);
    }
  }
}

export const questionController = new QuestionController();
