import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { roadMotionService } from "./roadMotionService";

export const roadMotionRoutes = Router();

roadMotionRoutes.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    const result = await roadMotionService.createTask(req.body, { headers: req.headers });
    ok(res, result);
  }),
);
