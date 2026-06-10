import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { getRequiredCurrentUser } from "../auth/authMiddleware";
import { videoGenerationService } from "./videoGenerationService";

export const videoGenerationRoutes = Router();

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
