import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { getRequiredCurrentUser } from "../auth/authMiddleware";
import { batchService } from "./batchService";

export const batchRoutes = Router();

batchRoutes.get(
  "/presets",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(res, await batchService.listPresets(current.user.id));
  }),
);

batchRoutes.post(
  "/presets",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(res, await batchService.savePreset(req.body, current.user.id));
  }),
);

batchRoutes.delete(
  "/presets/:presetId",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(res, await batchService.deletePreset(String(req.params.presetId), current.user.id));
  }),
);

batchRoutes.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    ok(res, await batchService.createBatchTask(req.body, { headers: req.headers }));
  }),
);

batchRoutes.get(
  "/tasks",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(
      res,
      await batchService.listBatchTasks({
        userId: current.user.id,
        status: typeof req.query.status === "string" ? req.query.status : undefined,
        page: Number(req.query.page ?? 1),
        pageSize: Number(req.query.pageSize ?? 20),
      }),
    );
  }),
);

batchRoutes.get(
  "/tasks/:batchId",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(res, await batchService.getBatchDetail(String(req.params.batchId), current.user.id));
  }),
);
