import type { SceneOption } from "../scene-common/sceneModuleFactory";
import { sceneReferenceMediaUrls } from "../../shared/mediaUrls";

export const skyStudioScenes: SceneOption[] = [
  {
    optionId: "sky-mirror-field",
    title: "天空镜场",
    referenceImageUrl: sceneReferenceMediaUrls.sky.mirrorField,
  },
  {
    optionId: "sunset-drive",
    title: "夕阳车镜",
    referenceImageUrl: sceneReferenceMediaUrls.sky.sunsetDrive,
  },
  {
    optionId: "cloud-sea-stage",
    title: "云海展台",
    referenceImageUrl: sceneReferenceMediaUrls.sky.cloudSeaStage,
  },
  {
    optionId: "cloud-parking",
    title: "云镜车场",
    referenceImageUrl: sceneReferenceMediaUrls.sky.cloudParking,
  },
];
