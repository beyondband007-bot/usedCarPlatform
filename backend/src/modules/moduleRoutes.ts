import { Router } from "express";

import { AppError } from "../shared/errors";
import { asyncHandler } from "../shared/asyncHandler";
import { ok } from "../shared/response";
import { getRequiredCurrentUser } from "./auth/authMiddleware";
import { batchRoutes } from "./batch-new/batchRoutes";
import { creativeImageRoutes } from "./creative-image/creativeImageRoutes";
import { deliveryRoutes } from "./delivery/deliveryRoutes";
import { interiorCollageRoutes } from "./interior-collage/interiorCollageRoutes";
import { interiorCleanRoutes } from "./interior-clean/interiorCleanRoutes";
import { languageConversionRoutes } from "./language-conversion/languageConversionRoutes";
import { longVideoRoutes } from "./long-video-generation/longVideoRoutes";
import { watermarkRemoveRoutes } from "./watermark-remove/watermarkRemoveRoutes";
import { lightConsistencyRoutes } from "./light-consistency/lightConsistencyRoutes";
import { outdoorSceneRoutes } from "./outdoor-scene/outdoorSceneRoutes";
import { paintRefreshRoutes } from "./paint-refresh/paintRefreshRoutes";
import { roadMotionRoutes } from "./road-motion/roadMotionRoutes";
import { showroomLightRoutes } from "./showroom-light/showroomLightRoutes";
import { shortVideoRoutes } from "./short-video/shortVideoRoutes";
import { skyStudioRoutes } from "./sky-studio/skyStudioRoutes";
import { tasksService } from "./tasks/tasksService";
import { videoGenerationRoutes } from "./video-generation/videoGenerationRoutes";

const moduleCodes = [] as const;

export const moduleRoutes = Router();

moduleRoutes.use("/showroom-light", showroomLightRoutes);
moduleRoutes.use("/outdoor-scene", outdoorSceneRoutes);
moduleRoutes.use("/road-motion", roadMotionRoutes);
moduleRoutes.use("/sky-studio", skyStudioRoutes);
moduleRoutes.use("/paint-refresh", paintRefreshRoutes);
moduleRoutes.use("/light-consistency", lightConsistencyRoutes);
moduleRoutes.use("/interior-clean", interiorCleanRoutes);
moduleRoutes.use("/interior-collage", interiorCollageRoutes);
moduleRoutes.use("/watermark-remove", watermarkRemoveRoutes);
moduleRoutes.use("/creative-image", creativeImageRoutes);
moduleRoutes.use("/short-video", shortVideoRoutes);
moduleRoutes.use("/video-generation", videoGenerationRoutes);
moduleRoutes.use("/long-video-generation", longVideoRoutes);
moduleRoutes.use("/language-conversion", languageConversionRoutes);
moduleRoutes.use("/batch-new", batchRoutes);
moduleRoutes.use("/delivery", deliveryRoutes);

moduleRoutes.get(
  "/:moduleCode/recent-tasks",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    const tasks = await tasksService.listRecentTasks({
      userId: current.user.id,
      moduleCode: String(req.params.moduleCode),
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      page: Number(req.query.page ?? 1),
      pageSize: Number(req.query.pageSize ?? 20),
    });
    ok(res, tasks);
  }),
);

for (const moduleCode of moduleCodes) {
  moduleRoutes.post(`/${moduleCode}/tasks`, () => {
    throw new AppError(501, 50100, `${moduleCode} module is not implemented yet`);
  });
}

