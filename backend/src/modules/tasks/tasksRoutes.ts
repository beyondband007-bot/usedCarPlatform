import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { tasksService } from "./tasksService";

export const tasksRoutes = Router();

tasksRoutes.get(
  "/",
  asyncHandler(async (req, res) => {
    const tasks = await tasksService.listRecentTasks({
      moduleCode: typeof req.query.moduleCode === "string" ? req.query.moduleCode : undefined,
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      page: Number(req.query.page ?? 1),
      pageSize: Number(req.query.pageSize ?? 20),
    });
    ok(res, tasks);
  }),
);

tasksRoutes.get(
  "/:taskId",
  asyncHandler(async (req, res) => {
    const task = await tasksService.getTaskDetail(String(req.params.taskId));
    ok(res, task);
  }),
);
