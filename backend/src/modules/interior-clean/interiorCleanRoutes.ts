import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { interiorCleanService } from "./interiorCleanService";

export const interiorCleanRoutes = Router();

interiorCleanRoutes.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    const result = await interiorCleanService.createTask(req.body);
    ok(res, result);
  }),
);
