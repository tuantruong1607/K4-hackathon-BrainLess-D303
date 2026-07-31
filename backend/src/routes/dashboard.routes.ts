import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminAuth.js";

const router = Router();

// All dashboard routes require admin authentication
router.use(authenticate, adminOnly);

router.get("/stats", dashboardController.getStats);
router.get("/progress", dashboardController.getProgress);
router.get("/quiz-results", dashboardController.getQuizResults);

export default router;
