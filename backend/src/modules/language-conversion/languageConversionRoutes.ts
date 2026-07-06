import fs from "node:fs";
import path from "node:path";

import { Router } from "express";
import multer from "multer";

import { env } from "../../config/env";
import { asyncHandler } from "../../shared/asyncHandler";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { ok } from "../../shared/response";
import { getRequiredCurrentUser } from "../auth/authMiddleware";
import { languageConversionService } from "./languageConversionService";

const uploadDir = path.join(env.uploadDir, "language-conversion");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".mp4";
      callback(null, `${createId("language_video")}${ext}`);
    },
  }),
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!["video/mp4", "video/quicktime", "video/webm"].includes(file.mimetype)) {
      callback(errors.fileTypeUnsupported({ mimeType: file.mimetype }));
      return;
    }
    callback(null, true);
  },
});

export const languageConversionRoutes = Router();

languageConversionRoutes.post(
  "/tasks",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    if (!req.file) throw errors.invalidParameter("file is required");

    const task = languageConversionService.createTask({
      userId: current.user.id,
      file: req.file,
      sourceLanguage: req.body.sourceLanguage,
      targetLanguage: req.body.targetLanguage,
    });
    ok(res, task);
  }),
);

languageConversionRoutes.get(
  "/tasks",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(res, languageConversionService.listTasks(current.user.id));
  }),
);

languageConversionRoutes.get(
  "/tasks/:taskId",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    const task = languageConversionService.getTask(String(req.params.taskId), current.user.id);
    ok(res, task);
  }),
);
