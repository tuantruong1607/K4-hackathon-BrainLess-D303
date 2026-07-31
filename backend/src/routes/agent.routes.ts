import { Router } from "express";
import { agentController } from "../controllers/agent.controller.js";
import { authenticate } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminAuth.js";

const router = Router();

router.use(authenticate);

// Student can ask AI tutor
router.post("/ask", agentController.ask);

// Admin can generate quiz via AI
router.post("/generate-quiz", adminOnly, agentController.generateQuiz);

// Analyze user level
router.post("/analyze-level", agentController.analyzeLevel);

export default router;
