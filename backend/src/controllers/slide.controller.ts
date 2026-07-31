import { Request, Response, NextFunction } from "express";
import { slideService } from "../services/slide.service.js";
import { sendSuccess } from "../utils/response.js";
import { AuthRequest } from "../middleware/auth.js";

export class SlideController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slides = await slideService.findAll(req.supabase!);
      sendSuccess(res, slides, "Slides retrieved");
    } catch (error) {
      next(error);
    }
  }

  async getByDay(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slides = await slideService.findByDay(req.supabase!, req.params.day as string);
      sendSuccess(res, slides, "Slides retrieved");
    } catch (error) {
      next(error);
    }
  }

  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "PDF file is required",
          statusCode: 400,
        });
        return;
      }

      const slide = await slideService.create({
        day: req.body.day,
        title: req.body.title,
        pdfPath: req.file.filename,
        previewPath: req.body.previewPath || undefined,
      });

      sendSuccess(res, slide, "Slide uploaded", 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const slide = await slideService.update(req.params.id as string, req.body);
      sendSuccess(res, slide, "Slide updated");
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await slideService.delete(req.params.id as string);
      sendSuccess(res, null, "Slide deleted");
    } catch (error) {
      next(error);
    }
  }
}

export const slideController = new SlideController();
