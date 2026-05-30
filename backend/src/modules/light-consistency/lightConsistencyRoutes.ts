import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { lightConsistencyService } from "./lightConsistencyService";

export const lightConsistencyRoutes = Router();

lightConsistencyRoutes.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    const result = await lightConsistencyService.createTask(req.body);
    ok(res, result);
  }),
);
