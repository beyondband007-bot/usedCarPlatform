import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import type { createSceneModuleService } from "./sceneModuleFactory";

export const createSceneModuleRoutes = (
  service: ReturnType<typeof createSceneModuleService>,
) => {
  const router = Router();

  router.post(
    "/tasks",
    asyncHandler(async (req, res) => {
      const result = await service.createTask(req.body, { headers: req.headers });
      ok(res, result);
    }),
  );

  return router;
};
