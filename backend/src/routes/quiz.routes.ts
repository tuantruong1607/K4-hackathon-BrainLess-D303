import { Router } from "express";
import { quizController } from "../controllers/quiz.controller.js";
import { authenticate, authenticateOptional } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminAuth.js";
import { validate } from "../middleware/validate.js";
import {
  createQuizSchema,
  updateQuizSchema,
  quizQuerySchema,
  scheduleQuizSchema,
  submitQuizSchema,
} from "../validators/quiz.validator.js";

const router = Router();

// Student + Admin routes
router.get("/", authenticateOptional, validate(quizQuerySchema, "query"), quizController.getAll);
router.get("/:id", authenticateOptional, quizController.getById);
router.post("/submit", authenticate, validate(submitQuizSchema), quizController.submit);

// Admin-only routes
router.post(
  "/",
  authenticate,
  adminOnly,
  validate(createQuizSchema),
  quizController.create
);
router.put(
  "/:id",
  authenticate,
  adminOnly,
  validate(updateQuizSchema),
  quizController.update
);
router.delete("/:id", authenticate, adminOnly, quizController.delete);
router.post("/:id/activate", authenticate, adminOnly, quizController.activate);
router.post("/:id/deactivate", authenticate, adminOnly, quizController.deactivate);
router.post(
  "/:id/schedule",
  authenticate,
  adminOnly,
  validate(scheduleQuizSchema),
  quizController.schedule
);

export default router;

