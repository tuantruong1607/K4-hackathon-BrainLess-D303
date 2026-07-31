import { Router } from "express";
import { questionController } from "../controllers/question.controller.js";
import { authenticate } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminAuth.js";
import { validate } from "../middleware/validate.js";
import {
  createQuestionSchema,
  updateQuestionSchema,
  importQuestionsSchema,
  generateQuestionsSchema,
  questionQuerySchema,
} from "../validators/question.validator.js";

const router = Router();

// All question routes require admin authentication
router.use(authenticate, adminOnly);

router.get(
  "/",
  validate(questionQuerySchema, "query"),
  questionController.getAll
);

router.post(
  "/",
  validate(createQuestionSchema),
  questionController.create
);

router.put(
  "/:id",
  validate(updateQuestionSchema),
  questionController.update
);

router.delete("/:id", questionController.delete);

router.post(
  "/import",
  validate(importQuestionsSchema),
  questionController.importQuestions
);

router.get("/export/:quizId", questionController.exportQuestions);

router.post(
  "/generate",
  validate(generateQuestionsSchema),
  questionController.generate
);

export default router;
