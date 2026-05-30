import fs from "node:fs";
import path from "node:path";

import { Router } from "express";
import multer from "multer";

import { env } from "../../config/env";
import { asyncHandler } from "../../shared/asyncHandler";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { ok } from "../../shared/response";
import { userLogoService } from "./userLogoService";

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

export const userLogoRoutes = Router();

userLogoRoutes.get(
  "/logo",
  asyncHandler(async (_req, res) => {
    const logo = await userLogoService.getDefaultLogo();
    ok(res, logo);
  }),
);

userLogoRoutes.post(
  "/logo",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw errors.invalidParameter("file is required");
    }

    const result = await userLogoService.replaceDefaultLogo(req.file);
    ok(res, result);
  }),
);
