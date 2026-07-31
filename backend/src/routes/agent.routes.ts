import { Router } from "express";
import { agentController } from "../controllers/agent.controller.js";
import { authenticate, authenticateOptional } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminAuth.js";

const router = Router();

router.get("/health", authenticateOptional, agentController.health);

// Student can ask AI tutor (optionally authenticated for guests)
router.post("/ask", authenticateOptional, agentController.ask);

// Admin can generate quiz via AI
router.post("/generate-quiz", authenticate, adminOnly, agentController.generateQuiz);

// Analyze user level
router.post("/analyze-level", authenticate, agentController.analyzeLevel);

export default router;

