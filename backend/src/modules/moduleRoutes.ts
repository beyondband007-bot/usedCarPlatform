import { Router } from "express";

import { AppError } from "../shared/errors";
import { interiorCleanRoutes } from "./interior-clean/interiorCleanRoutes";
import { lightConsistencyRoutes } from "./light-consistency/lightConsistencyRoutes";
import { outdoorSceneRoutes } from "./outdoor-scene/outdoorSceneRoutes";
import { paintRefreshRoutes } from "./paint-refresh/paintRefreshRoutes";
import { roadMotionRoutes } from "./road-motion/roadMotionRoutes";
import { showroomLightRoutes } from "./showroom-light/showroomLightRoutes";
import { skyStudioRoutes } from "./sky-studio/skyStudioRoutes";

const moduleCodes = [
  "batch-new",
] as const;

export const moduleRoutes = Router();

moduleRoutes.use("/showroom-light", showroomLightRoutes);
moduleRoutes.use("/outdoor-scene", outdoorSceneRoutes);
moduleRoutes.use("/road-motion", roadMotionRoutes);
moduleRoutes.use("/sky-studio", skyStudioRoutes);
moduleRoutes.use("/paint-refresh", paintRefreshRoutes);
moduleRoutes.use("/light-consistency", lightConsistencyRoutes);
moduleRoutes.use("/interior-clean", interiorCleanRoutes);

for (const moduleCode of moduleCodes) {
  moduleRoutes.post(`/${moduleCode}/tasks`, () => {
    throw new AppError(501, 50100, `${moduleCode} module is not implemented yet`);
  });
}

moduleRoutes.get("/delivery/tasks", () => {
  throw new AppError(501, 50100, "delivery module is not implemented yet");
});
