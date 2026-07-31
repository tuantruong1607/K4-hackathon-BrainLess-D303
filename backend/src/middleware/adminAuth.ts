import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";
import { sendError } from "../utils/response.js";

export function adminOnly(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    sendError(res, "Authentication required", 401);
    return;
  }

  if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
    sendError(res, "Admin access required", 403);
    return;
  }

  next();
}
