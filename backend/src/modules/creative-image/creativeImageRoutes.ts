import fs from "node:fs";
import path from "node:path";

import { Router } from "express";
import multer from "multer";

import { env } from "../../config/env";
import { asyncHandler } from "../../shared/asyncHandler";
import { createId } from "../../shared/ids";
import { ok } from "../../shared/response";
import { creativeImageService } from "./creativeImageService";

fs.mkdirSync(env.uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, env.uploadDir),
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname).toLowerCase();
      callback(null, `${createId("upload")}${ext}`);
    },
  }),
  limits: {
    fileSize: env.maxUploadMb * 1024 * 1024,
  },
});

export const creativeImageRoutes = Router();

creativeImageRoutes.post(
  "/conversations",
  asyncHandler(async (req, res) => {
    const result = await creativeImageService.createConversation(req.body);
    ok(res, result);
  }),
);

creativeImageRoutes.get(
  "/conversations",
  asyncHandler(async (req, res) => {
    const result = await creativeImageService.listConversations({
      page: Number(req.query.page ?? 1),
      pageSize: Number(req.query.pageSize ?? 20),
    });
    ok(res, result);
  }),
);

creativeImageRoutes.get(
  "/conversations/:conversationId",
  asyncHandler(async (req, res) => {
    const result = await creativeImageService.getConversation(String(req.params.conversationId));
    ok(res, result);
  }),
);

creativeImageRoutes.delete(
  "/conversations/:conversationId",
  asyncHandler(async (req, res) => {
    const result = await creativeImageService.deleteConversation(String(req.params.conversationId));
    ok(res, result);
  }),
);

creativeImageRoutes.get(
  "/conversations/:conversationId/messages",
  asyncHandler(async (req, res) => {
    const result = await creativeImageService.listMessages(String(req.params.conversationId));
    ok(res, result);
  }),
);

creativeImageRoutes.post(
  "/conversations/:conversationId/assets",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const result = await creativeImageService.uploadAsset(
      String(req.params.conversationId),
      req.file,
      req.body.purpose,
    );
    ok(res, result);
  }),
);

creativeImageRoutes.post(
  "/conversations/:conversationId/generations",
  asyncHandler(async (req, res) => {
    const result = await creativeImageService.createGeneration(
      String(req.params.conversationId),
      req.body,
      { headers: req.headers },
    );
    ok(res, result);
  }),
);
