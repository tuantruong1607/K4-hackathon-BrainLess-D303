import { Router } from "express";
import { progressController } from "../controllers/progress.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { updateProgressSchema } from "../validators/progress.validator.js";

const router = Router();

router.use(authenticate);

router.get("/", progressController.getProgress);
router.post("/", validate(updateProgressSchema), progressController.updateProgress);

export default router;
