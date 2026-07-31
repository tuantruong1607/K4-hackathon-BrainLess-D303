import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import {
  registerSchema,
  loginSchema,
  adminLoginSchema,
} from "../validators/auth.validator.js";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  authController.register
);

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  authController.login
);

router.post(
  "/admin/login",
  authLimiter,
  validate(adminLoginSchema),
  authController.adminLogin
);

router.get("/me", authenticate, authController.getMe);

export default router;
