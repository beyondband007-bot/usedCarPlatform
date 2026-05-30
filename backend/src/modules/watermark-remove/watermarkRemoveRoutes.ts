import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { watermarkRemoveService } from "./watermarkRemoveService";

export const watermarkRemoveRoutes = Router();

watermarkRemoveRoutes.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    const result = await watermarkRemoveService.createTask(req.body);
    ok(res, result);
  }),
);
