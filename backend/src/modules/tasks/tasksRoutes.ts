import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { tasksService } from "./tasksService";

export const tasksRoutes = Router();

tasksRoutes.get(
  "/:taskId",
  asyncHandler(async (req, res) => {
    const task = await tasksService.getTaskDetail(String(req.params.taskId));
    ok(res, task);
  }),
);
