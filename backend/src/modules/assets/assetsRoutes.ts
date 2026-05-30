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
import { allowedPurposes, assetsService } from "./assetsService";

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, env.uploadDir),
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    callback(null, `${createId("upload")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: env.maxUploadMb * 1024 * 1024,
  },
});

export const assetsRoutes = Router();

assetsRoutes.post(
  "/upload",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const purpose = req.body.purpose as AssetPurpose | undefined;
    if (!purpose || !allowedPurposes.includes(purpose)) {
      throw errors.invalidParameter("invalid asset purpose", { purpose });
    }

    if (!req.file) {
      throw errors.invalidParameter("file is required");
    }

    const asset = await assetsService.saveUploadedFile(req.file, purpose);
    ok(res, assetsService.toResponse(asset));
  }),
);
