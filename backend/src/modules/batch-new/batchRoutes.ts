import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { batchService } from "./batchService";

export const batchRoutes = Router();

batchRoutes.get(
  "/presets",
  asyncHandler(async (_req, res) => {
    ok(res, await batchService.listPresets());
  }),
);

batchRoutes.post(
  "/presets",
  asyncHandler(async (req, res) => {
    ok(res, await batchService.savePreset(req.body));
  }),
);

batchRoutes.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    ok(res, await batchService.createBatchTask(req.body));
  }),
);

batchRoutes.get(
  "/tasks",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await batchService.listBatchTasks({
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
    ok(res, await batchService.getBatchDetail(String(req.params.batchId)));
  }),
);
