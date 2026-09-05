import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import { env } from "./env";
import { AppError } from "../middleware/errorHandler";

export const uploadsDir = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, _file, cb) => {
    cb(null, `${randomUUID()}.pdf`);
  },
});

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void {
  const extension = path.extname(file.originalname).toLowerCase();
  const isPdf =
    file.mimetype === "application/pdf" && extension === ".pdf";

  if (!isPdf) {
    cb(new AppError(415, "INVALID_FILE_TYPE", "Only PDF files are allowed"));
    return;
  }

  cb(null, true);
}

export const resumeUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxUploadSizeMb * 1024 * 1024,
    files: 1,
  },
});
