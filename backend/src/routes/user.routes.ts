import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminAuth.js";
import { validate } from "../middleware/validate.js";
import {
  updateUserSchema,
  userQuerySchema,
  resetPasswordSchema,
} from "../validators/user.validator.js";

const router = Router();

// All user routes require admin authentication
router.use(authenticate, adminOnly);

router.get("/", validate(userQuerySchema, "query"), userController.getAll);
router.get("/:id", userController.getById);
router.put("/:id", validate(updateUserSchema), userController.update);
router.delete("/:id", userController.delete);
router.post("/:id/ban", userController.toggleBan);
router.post(
  "/:id/reset-password",
  validate(resetPasswordSchema),
  userController.resetPassword
);

export default router;
