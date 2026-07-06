import fs from "node:fs";
import path from "node:path";

import { Router } from "express";
import multer from "multer";

import { env } from "../../config/env";
import { asyncHandler } from "../../shared/asyncHandler";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { ok } from "../../shared/response";
import type { AssetPurpose } from "../../shared/types";
import { getRequiredCurrentUser } from "../auth/authMiddleware";
import { allowedPurposes, assetsService } from "./assetsService";

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, env.uploadDir),
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    callback(null, `${createId("upload")}${ext}`);
  },
});

// Multer only supports a single fileSize limit, so it is set to the (larger)
// video limit; non-video files are checked against the stricter image limit
// after the upload finishes.
const upload = multer({
  storage,
  limits: {
    fileSize: Math.max(env.maxUploadMb, env.maxVideoUploadMb) * 1024 * 1024,
  },
});

const maxUploadBytesFor = (mimeType: string) => {
  const limitMb = mimeType.toLowerCase().startsWith("video/")
    ? env.maxVideoUploadMb
    : env.maxUploadMb;
  return { limitMb, limitBytes: limitMb * 1024 * 1024 };
};

export const assetsRoutes = Router();

assetsRoutes.post(
  "/upload",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    const purpose = req.body.purpose as AssetPurpose | undefined;
    if (!purpose || !allowedPurposes.includes(purpose)) {
      throw errors.invalidParameter("invalid asset purpose", { purpose });
    }

    if (!req.file) {
      throw errors.invalidParameter("file is required");
    }

    const { limitMb, limitBytes } = maxUploadBytesFor(req.file.mimetype);
    if (req.file.size > limitBytes) {
      await fs.promises.unlink(req.file.path).catch(() => undefined);
      throw errors.fileTooLarge({ maxUploadMb: limitMb, size: req.file.size });
    }

    const asset = await assetsService.saveUploadedFile(req.file, purpose, current.user.id);
    ok(res, assetsService.toResponse(asset));
  }),
);
