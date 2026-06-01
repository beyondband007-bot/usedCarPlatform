import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { interiorCollageService } from "./interiorCollageService";

export const interiorCollageRoutes = Router();

interiorCollageRoutes.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    const result = await interiorCollageService.createTasks(req.body);
    ok(res, result);
  }),
);
