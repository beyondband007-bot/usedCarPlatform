import { outdoorSceneScenes } from "../outdoor-scene/outdoorSceneScenes";
import { roadMotionScenes } from "../road-motion/roadMotionScenes";
import { showroomLightScenes } from "../showroom-light/showroomLightScenes";
import { skyStudioScenes } from "../sky-studio/skyStudioScenes";
import { sceneReferenceMediaUrls } from "../../shared/mediaUrls";
import type { LogoPlacement } from "../../shared/types";

export interface BatchScene {
  optionId: string;
  title: string;
  referenceImageUrl?: string;
  referenceImagePath?: string;
  supportedLogoPlacements?: LogoPlacement[];
}

/** 与前端 `workspace.ts` 道路动态场景 optionId 一致 */
const roadSceneReferenceByOptionId: Record<string, string> = {
  city_day_road: sceneReferenceMediaUrls.road.cityDayRoad,
  highway_sunset: sceneReferenceMediaUrls.road.highwaySunset,
  overpass_dusk: sceneReferenceMediaUrls.road.overpassDusk,
  business_park: sceneReferenceMediaUrls.road.businessPark,
  rainy_night_city: sceneReferenceMediaUrls.road.rainyNightCity,
  mountain_curve: sceneReferenceMediaUrls.road.mountainCurve,
  coastal_road: sceneReferenceMediaUrls.road.coastalRoad,
  forest_avenue: sceneReferenceMediaUrls.road.forestAvenue,
  snow_road: sceneReferenceMediaUrls.road.snowRoad,
  tunnel_exit: sceneReferenceMediaUrls.road.tunnelExit,
};

const roadMotionBatchScenes: BatchScene[] = roadMotionScenes.map((scene) => ({
  optionId: scene.optionId,
  title: scene.title,
  referenceImageUrl: roadSceneReferenceByOptionId[scene.optionId],
  supportedLogoPlacements: ["plate"],
}));

/** 与场景更换各模块及前端批量场景目录保持一致 */
export const batchScenes: BatchScene[] = [
  ...showroomLightScenes.map((scene) => ({ ...scene })),
  ...outdoorSceneScenes.map((scene) => ({ ...scene, supportedLogoPlacements: ["plate"] as LogoPlacement[] })),
  ...roadMotionBatchScenes,
  ...skyStudioScenes.map((scene) => ({ ...scene, supportedLogoPlacements: ["plate"] as LogoPlacement[] })),
];

const findBatchSceneByOptionId = (optionId: string) =>
  batchScenes.find((scene) => scene.optionId === optionId);

const findRoadMotionBatchScene = (optionId: string): BatchScene | undefined => {
  const roadScene = roadMotionScenes.find(
    (scene) =>
      scene.optionId === optionId ||
      scene.legacyOptionIds?.includes(optionId),
  );
  if (!roadScene) return undefined;

  return {
    optionId: roadScene.optionId,
    title: roadScene.title,
    referenceImageUrl: roadSceneReferenceByOptionId[roadScene.optionId],
    supportedLogoPlacements: ["plate"],
  };
};

export const resolveBatchScene = (
  optionId?: string | null,
  sceneReferenceImageUrl?: string | null,
): BatchScene => {
  if (optionId) {
    const matched =
      findBatchSceneByOptionId(optionId) ?? findRoadMotionBatchScene(optionId);
    if (matched) return matched;
  }

  if (sceneReferenceImageUrl) {
    return {
      optionId: optionId ?? "custom-scene",
      title: "",
      referenceImageUrl: sceneReferenceImageUrl,
    };
  }

  return batchScenes[0];
};

/** 与展厅棚拍等场景更换模块一致：优先使用前端传入的场景图 URL */
export const resolveBatchSceneReferenceImageUrl = (input: {
  sceneOptionId?: string | null;
  sceneReferenceImageUrl?: string | null;
  uploadedLocalFileUrl?: string | null;
}) => {
  const trimmedClientUrl = input.sceneReferenceImageUrl?.trim();
  if (trimmedClientUrl) {
    return trimmedClientUrl;
  }

  if (input.uploadedLocalFileUrl) {
    return input.uploadedLocalFileUrl;
  }

  const scene = resolveBatchScene(input.sceneOptionId);
  return scene.referenceImageUrl ?? null;
};

export const shouldUploadBatchSceneFromLocalPath = (
  sceneReferenceImageUrl?: string | null,
) => !sceneReferenceImageUrl?.trim();
