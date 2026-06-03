import path from "node:path";

import { env } from "../../config/env";
import { outdoorSceneScenes } from "../outdoor-scene/outdoorSceneScenes";
import { roadMotionScenes } from "../road-motion/roadMotionScenes";
import { showroomLightScenes } from "../showroom-light/showroomLightScenes";
import { skyStudioScenes } from "../sky-studio/skyStudioScenes";

const workspaceAsset = (...segments: string[]) =>
  path.resolve(env.rootDir, "../src/assets/img", ...segments);

export interface BatchScene {
  optionId: string;
  title: string;
  referenceImageUrl?: string;
  referenceImagePath?: string;
}

/** 与前端 `workspace.ts` 道路动态场景 optionId 一致 */
const roadSceneReferenceByOptionId: Record<string, string> = {
  city_day_road: workspaceAsset("道路动态", "场景选择", "城市主干道.png"),
  highway_sunset: workspaceAsset("道路动态", "场景选择", "夕阳高速.png"),
  overpass_dusk: workspaceAsset("道路动态", "场景选择", "傍晚高架.png"),
  business_park: workspaceAsset("道路动态", "场景选择", "商务园区.png"),
  rainy_night_city: workspaceAsset("道路动态", "场景选择", "雨夜城市.png"),
  mountain_curve: workspaceAsset("道路动态", "场景选择", "山路弯道.png"),
  coastal_road: workspaceAsset("道路动态", "场景选择", "海岸公路.png"),
  forest_avenue: workspaceAsset("道路动态", "场景选择", "林荫大道.png"),
  snow_road: workspaceAsset("道路动态", "场景选择", "雪后公路.png"),
  tunnel_exit: workspaceAsset("道路动态", "场景选择", "隧道出口.png"),
};

const roadMotionBatchScenes: BatchScene[] = roadMotionScenes.map((scene) => ({
  optionId: scene.optionId,
  title: scene.title,
  referenceImagePath: roadSceneReferenceByOptionId[scene.optionId],
}));

/** 与场景更换各模块及前端批量场景目录保持一致 */
export const batchScenes: BatchScene[] = [
  ...showroomLightScenes.map((scene) => ({ ...scene })),
  ...outdoorSceneScenes.map((scene) => ({ ...scene })),
  ...roadMotionBatchScenes,
  ...skyStudioScenes.map((scene) => ({ ...scene })),
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
    referenceImagePath: roadSceneReferenceByOptionId[roadScene.optionId],
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
