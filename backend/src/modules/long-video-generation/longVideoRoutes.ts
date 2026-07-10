import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { getRequiredCurrentUser } from "../auth/authMiddleware";
import { longVideoService } from "./longVideoService";

export const longVideoRoutes = Router();

longVideoRoutes.post(
  "/drafts",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(res, await longVideoService.createDraft(req.body, current.user.id));
  }),
);

longVideoRoutes.get(
  "/drafts/:draftId",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(res, await longVideoService.getDraft(String(req.params.draftId), current.user.id));
  }),
);

longVideoRoutes.patch(
  "/drafts/:draftId/segments",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(
      res,
      await longVideoService.updateSegments(
        String(req.params.draftId),
        req.body,
        current.user.id,
      ),
    );
  }),
);

longVideoRoutes.post(
  "/drafts/:draftId/audio-preview",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(
      res,
      await longVideoService.createAudioPreview(
        String(req.params.draftId),
        current.user.id,
      ),
    );
  }),
);

longVideoRoutes.get(
  "/audio-previews/:audioPreviewId",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(
      res,
      await longVideoService.getAudioPreview(
        String(req.params.audioPreviewId),
        current.user.id,
      ),
    );
  }),
);

longVideoRoutes.post(
  "/drafts/:draftId/tasks",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(
      res,
      await longVideoService.createTask(
        String(req.params.draftId),
        req.body,
        current.user.id,
        { headers: req.headers },
      ),
    );
  }),
);

longVideoRoutes.get(
  "/tasks/:taskId",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(res, await longVideoService.getTask(String(req.params.taskId), current.user.id));
  }),
);

longVideoRoutes.post(
  "/tasks/:taskId/retry",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(
      res,
      await longVideoService.retryTask(String(req.params.taskId), current.user.id, {
        headers: req.headers,
      }),
    );
  }),
);
