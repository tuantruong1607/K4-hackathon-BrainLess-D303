import { Router } from "express";
import { quizController } from "../controllers/quiz.controller.js";
import { authenticate } from "../middleware/auth.js";
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

// All quiz routes require authentication
router.use(authenticate);

// Student + Admin routes
router.get("/", validate(quizQuerySchema, "query"), quizController.getAll);
router.get("/:id", quizController.getById);
router.post("/submit", validate(submitQuizSchema), quizController.submit);

// Admin-only routes
router.post(
  "/",
  adminOnly,
  validate(createQuizSchema),
  quizController.create
);
router.put(
  "/:id",
  adminOnly,
  validate(updateQuizSchema),
  quizController.update
);
router.delete("/:id", adminOnly, quizController.delete);
router.post("/:id/activate", adminOnly, quizController.activate);
router.post("/:id/deactivate", adminOnly, quizController.deactivate);
router.post(
  "/:id/schedule",
  adminOnly,
  validate(scheduleQuizSchema),
  quizController.schedule
);

export default router;
