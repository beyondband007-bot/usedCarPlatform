import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { shortVideoService } from "./shortVideoService";

export const shortVideoRoutes = Router();

shortVideoRoutes.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    const result = await shortVideoService.createTask(req.body, { headers: req.headers });
    ok(res, result);
  }),
);
