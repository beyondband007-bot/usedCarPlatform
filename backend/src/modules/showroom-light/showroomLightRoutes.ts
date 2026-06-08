import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { showroomLightService } from "./showroomLightService";

export const showroomLightRoutes = Router();

showroomLightRoutes.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    const result = await showroomLightService.createTask(req.body, { headers: req.headers });
    ok(res, result);
  }),
);

showroomLightRoutes.get(
  "/scenes",
  asyncHandler(async (_req, res) => {
    ok(res, showroomLightService.listScenes());
  }),
);
