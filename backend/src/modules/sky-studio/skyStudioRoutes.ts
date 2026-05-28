import { createSceneModuleService } from "../scene-common/sceneModuleFactory";
import { createSceneModuleRoutes } from "../scene-common/sceneModuleRoutes";
import { skyStudioPrompt, skyStudioWithLogoPrompt } from "./skyStudioPrompts";
import { skyStudioScenes } from "./skyStudioScenes";

export const skyStudioService = createSceneModuleService({
  moduleCode: "sky-studio",
  uploadPath: "used-car-platform/sky-studio",
  defaultPrompt: skyStudioPrompt,
  logoPrompt: skyStudioWithLogoPrompt,
  scenes: skyStudioScenes,
});

export const skyStudioRoutes = createSceneModuleRoutes(skyStudioService);

