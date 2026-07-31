import { Request, Response, NextFunction } from "express";
import { dashboardService } from "../services/dashboard.service.js";
import { sendSuccess } from "../utils/response.js";

export class DashboardController {
  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getStats();
      sendSuccess(res, stats, "Dashboard stats retrieved");
    } catch (error) {
      next(error);
    }
  }

  async getProgress(_req: Request, res: Response, next: NextFunction) {
    try {
      const progress = await dashboardService.getProgressOverview();
      sendSuccess(res, progress, "Progress overview retrieved");
    } catch (error) {
      next(error);
    }
  }

  async getQuizResults(_req: Request, res: Response, next: NextFunction) {
    try {
      const results = await dashboardService.getQuizResultsAnalytics();
      sendSuccess(res, results, "Quiz results analytics retrieved");
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
