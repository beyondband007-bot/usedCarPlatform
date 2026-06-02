import path from "node:path";

import { env } from "../../config/env";
import type { SceneOption } from "../scene-common/sceneModuleFactory";

const workspaceAsset = (...segments: string[]) => path.resolve(env.rootDir, "../src/assets/img", ...segments);

export const skyStudioScenes: SceneOption[] = [
  {
    optionId: "sky-mirror-field",
    title: "天空镜场",
    referenceImagePath: workspaceAsset("天空影棚", "天空影棚场景", "天空镜场场景.png"),
  },
  {
    optionId: "sunset-drive",
    title: "夕阳车镜",
    referenceImagePath: workspaceAsset("天空影棚", "天空影棚场景", "夕阳车镜场景.png"),
  },
  {
    optionId: "cloud-sea-stage",
    title: "云海展台",
    referenceImagePath: workspaceAsset("天空影棚", "天空影棚场景", "云海展台场景.png"),
  },
  {
    optionId: "cloud-parking",
    title: "云镜车场",
    referenceImagePath: workspaceAsset("天空影棚", "天空影棚场景", "云镜车场场景.png"),
  },
];

