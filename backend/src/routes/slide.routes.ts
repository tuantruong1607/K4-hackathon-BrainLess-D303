import { Router } from "express";
import multer from "multer";
import path from "path";
import { slideController } from "../controllers/slide.controller.js";
import { authenticate } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminAuth.js";
import { env } from "../config/env.js";

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `slide-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

const router = Router();

router.use(authenticate);

// Student + Admin
router.get("/", slideController.getAll);
router.get("/day/:day", slideController.getByDay);

// Admin only
router.post(
  "/",
  adminOnly,
  upload.single("pdf"),
  slideController.upload
);
router.put("/:id", adminOnly, slideController.update);
router.delete("/:id", adminOnly, slideController.delete);

export default router;
