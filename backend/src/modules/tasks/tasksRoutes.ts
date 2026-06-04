import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { getRequiredCurrentUser } from "../auth/authMiddleware";
import { tasksService } from "./tasksService";

export const tasksRoutes = Router();

tasksRoutes.get(
  "/",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    const tasks = await tasksService.listRecentTasks({
      userId: current.user.id,
      moduleCode: typeof req.query.moduleCode === "string" ? req.query.moduleCode : undefined,
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      page: Number(req.query.page ?? 1),
      pageSize: Number(req.query.pageSize ?? 20),
      scope: typeof req.query.scope === "string" ? req.query.scope : undefined,
    });
    ok(res, tasks);
  }),
);

tasksRoutes.get(
  "/:taskId",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    const task = await tasksService.getTaskDetail(String(req.params.taskId), {
      userId: current.user.id,
    });
    ok(res, task);
  }),
);
