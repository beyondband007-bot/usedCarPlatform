import { Router } from "express";

import { AppError } from "../shared/errors";
import { batchRoutes } from "./batch-new/batchRoutes";
import { deliveryRoutes } from "./delivery/deliveryRoutes";
import { interiorCleanRoutes } from "./interior-clean/interiorCleanRoutes";
import { watermarkRemoveRoutes } from "./watermark-remove/watermarkRemoveRoutes";
import { lightConsistencyRoutes } from "./light-consistency/lightConsistencyRoutes";
import { outdoorSceneRoutes } from "./outdoor-scene/outdoorSceneRoutes";
import { paintRefreshRoutes } from "./paint-refresh/paintRefreshRoutes";
import { roadMotionRoutes } from "./road-motion/roadMotionRoutes";
import { showroomLightRoutes } from "./showroom-light/showroomLightRoutes";
import { skyStudioRoutes } from "./sky-studio/skyStudioRoutes";

const moduleCodes = [] as const;

export const moduleRoutes = Router();

moduleRoutes.use("/showroom-light", showroomLightRoutes);
moduleRoutes.use("/outdoor-scene", outdoorSceneRoutes);
moduleRoutes.use("/road-motion", roadMotionRoutes);
moduleRoutes.use("/sky-studio", skyStudioRoutes);
moduleRoutes.use("/paint-refresh", paintRefreshRoutes);
moduleRoutes.use("/light-consistency", lightConsistencyRoutes);
moduleRoutes.use("/interior-clean", interiorCleanRoutes);
moduleRoutes.use("/watermark-remove", watermarkRemoveRoutes);
moduleRoutes.use("/batch-new", batchRoutes);
moduleRoutes.use("/delivery", deliveryRoutes);

for (const moduleCode of moduleCodes) {
  moduleRoutes.post(`/${moduleCode}/tasks`, () => {
    throw new AppError(501, 50100, `${moduleCode} module is not implemented yet`);
  });
}

