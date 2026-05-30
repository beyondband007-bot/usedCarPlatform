import { createSceneModuleService } from "../scene-common/sceneModuleFactory";
import { createSceneModuleRoutes } from "../scene-common/sceneModuleRoutes";
import { roadMotionPrompt, roadMotionWithLogoPrompt } from "./roadMotionPrompts";
import { roadMotionScenes } from "./roadMotionScenes";

export const roadMotionService = createSceneModuleService({
  moduleCode: "road-motion",
  uploadPath: "used-car-platform/road-motion",
  defaultPrompt: roadMotionPrompt,
  logoPrompt: roadMotionWithLogoPrompt,
  scenes: roadMotionScenes,
});

export const roadMotionRoutes = createSceneModuleRoutes(roadMotionService);

