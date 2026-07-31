import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import quizRoutes from "./quiz.routes.js";
import questionRoutes from "./question.routes.js";
import progressRoutes from "./progress.routes.js";
import slideRoutes from "./slide.routes.js";
import agentRoutes from "./agent.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/quiz", quizRoutes);
router.use("/questions", questionRoutes);
router.use("/progress", progressRoutes);
router.use("/slides", slideRoutes);
router.use("/agent", agentRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
