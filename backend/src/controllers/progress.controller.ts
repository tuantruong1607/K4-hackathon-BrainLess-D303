import { Response, NextFunction } from "express";
import { progressService } from "../services/progress.service.js";
import { sendSuccess } from "../utils/response.js";
import { AuthRequest } from "../middleware/auth.js";

export class ProgressController {
  async getProgress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const progress = await progressService.getByUserId(req.user!.id);
      sendSuccess(res, progress, "Progress retrieved");
    } catch (error) {
      next(error);
    }
  }

  async updateProgress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const progress = await progressService.upsert(req.user!.id, req.body);
      sendSuccess(res, progress, "Progress updated");
    } catch (error) {
      next(error);
    }
  }
}

export const progressController = new ProgressController();
