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
import { videoGenerationService } from "./videoGenerationService";

const voiceCloneUploadDir = path.join(env.uploadDir, "voice-clone");
fs.mkdirSync(voiceCloneUploadDir, { recursive: true });

const voiceCloneUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, voiceCloneUploadDir),
    filename: (_req, file, callback) => {
      callback(null, `${createId("voice_clone")}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: {
    fileSize: env.minimax.maxCloneAudioMb * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (![".mp3", ".m4a", ".wav"].includes(extension)) {
      callback(errors.fileTypeUnsupported({ allowedExtensions: [".mp3", ".m4a", ".wav"] }));
      return;
    }
    callback(null, true);
  },
});

export const videoGenerationRoutes = Router();

videoGenerationRoutes.get(
  "/workflow-contract",
  asyncHandler(async (_req, res) => {
    ok(res, videoGenerationService.getWorkflowContract());
  }),
);

videoGenerationRoutes.get(
  "/templates",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await videoGenerationService.listTemplates({
        type: req.query.type,
        style: req.query.style,
        search: req.query.search,
      }),
    );
  }),
);

videoGenerationRoutes.get(
  "/templates/:templateId",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await videoGenerationService.getTemplate(String(req.params.templateId)),
    );
  }),
);

videoGenerationRoutes.post(
  "/templates/:templateId/validate-inputs",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await videoGenerationService.validateTemplateInputs(
        String(req.params.templateId),
        req.body,
      ),
    );
  }),
);

videoGenerationRoutes.get(
  "/digital-humans",
  asyncHandler(async (_req, res) => {
    ok(res, await videoGenerationService.listDigitalHumans());
  }),
);

videoGenerationRoutes.get(
  "/digital-humans/:digitalHumanId/image",
  asyncHandler(async (req, res) => {
    res.sendFile(await videoGenerationService.getDigitalHumanImagePath(String(req.params.digitalHumanId)));
  }),
);

videoGenerationRoutes.get(
  "/digital-humans/:digitalHumanId/voice",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await videoGenerationService.getDigitalHumanVoice(
        String(req.params.digitalHumanId),
      ),
    );
  }),
);

videoGenerationRoutes.post(
  "/digital-humans/:digitalHumanId/voice-clone",
  voiceCloneUpload.single("file"),
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    if (!req.file) {
      throw errors.invalidParameter("voice clone audio file is required");
    }
    ok(
      res,
      await videoGenerationService.cloneDigitalHumanVoice({
        digitalHumanId: String(req.params.digitalHumanId),
        file: req.file,
        userId: current.user.id,
      }),
    );
  }),
);

videoGenerationRoutes.get(
  "/reference-materials",
  asyncHandler(async (_req, res) => {
    ok(res, await videoGenerationService.listReferenceMaterials());
  }),
);

videoGenerationRoutes.get(
  "/reference-materials/:referenceMaterialId/preview",
  asyncHandler(async (req, res) => {
    res.sendFile(await videoGenerationService.getReferencePreviewPath(String(req.params.referenceMaterialId)));
  }),
);

videoGenerationRoutes.post(
  "/script-drafts",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(res, await videoGenerationService.createScriptDraft(req.body, current.user.id));
  }),
);

videoGenerationRoutes.get(
  "/script-drafts/:scriptDraftId",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(
      res,
      await videoGenerationService.getScriptDraft(
        String(req.params.scriptDraftId),
        current.user.id,
      ),
    );
  }),
);

videoGenerationRoutes.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(
      res,
      await videoGenerationService.createVideoTask(req.body, current.user.id, {
        headers: req.headers,
      }),
    );
  }),
);

videoGenerationRoutes.get(
  "/tasks",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(
      res,
      await videoGenerationService.listVideoTasks(
        {
          status: req.query.status,
          page: req.query.page,
          pageSize: req.query.pageSize,
        },
        current.user.id,
      ),
    );
  }),
);

videoGenerationRoutes.get(
  "/tasks/:taskId",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(
      res,
      await videoGenerationService.getVideoTask(
        String(req.params.taskId),
        current.user.id,
      ),
    );
  }),
);

videoGenerationRoutes.post(
  "/tasks/:taskId/cancel",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(
      res,
      await videoGenerationService.cancelVideoTask(
        String(req.params.taskId),
        current.user.id,
      ),
    );
  }),
);

videoGenerationRoutes.post(
  "/tasks/:taskId/regenerate",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(
      res,
      await videoGenerationService.regenerateVideoTask(
        String(req.params.taskId),
        current.user.id,
        { headers: req.headers },
      ),
    );
  }),
);
