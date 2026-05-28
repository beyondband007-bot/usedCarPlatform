import { createSceneModuleService } from "../scene-common/sceneModuleFactory";
import { createSceneModuleRoutes } from "../scene-common/sceneModuleRoutes";
import { outdoorScenePrompt, outdoorSceneWithLogoPrompt } from "./outdoorScenePrompts";
import { outdoorSceneScenes } from "./outdoorSceneScenes";

export const outdoorSceneService = createSceneModuleService({
  moduleCode: "outdoor-scene",
  uploadPath: "used-car-platform/outdoor-scene",
  defaultPrompt: outdoorScenePrompt,
  logoPrompt: outdoorSceneWithLogoPrompt,
  scenes: outdoorSceneScenes,
});

export const outdoorSceneRoutes = createSceneModuleRoutes(outdoorSceneService);

