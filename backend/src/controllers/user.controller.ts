import { Request, Response, NextFunction } from "express";
import { userService } from "../services/user.service.js";
import { sendSuccess, sendPaginated } from "../utils/response.js";

export class UserController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { users, total, page, limit } = await userService.findAll(
        req.query as any
      );
      sendPaginated(res, users, total, page, limit, "Users retrieved");
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.findById(req.params.id as string);
      sendSuccess(res, user, "User retrieved");
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.update(req.params.id as string, req.body);
      sendSuccess(res, user, "User updated");
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await userService.delete(req.params.id as string);
      sendSuccess(res, null, "User deleted");
    } catch (error) {
      next(error);
    }
  }

  async toggleBan(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.toggleBan(req.params.id as string);
      sendSuccess(
        res,
        user,
        user.isBanned ? "User banned" : "User unbanned"
      );
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await userService.resetPassword(req.params.id as string, req.body);
      sendSuccess(res, null, "Password reset successful");
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
