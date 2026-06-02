import path from "node:path";

import { env } from "../../config/env";
import type { SceneOption } from "../scene-common/sceneModuleFactory";

const workspaceAsset = (...segments: string[]) => path.resolve(env.rootDir, "../src/assets/img", ...segments);

export const outdoorSceneScenes: SceneOption[] = [
  {
    optionId: "tree-park",
    title: "林荫公园",
    referenceImagePath: workspaceAsset("户外场景", "场景", "图1.png"),
  },
  {
    optionId: "mountain-lake",
    title: "山野湖畔",
    referenceImagePath: workspaceAsset("户外场景", "场景", "图2.png"),
  },
  {
    optionId: "city-block",
    title: "城市街区",
    referenceImagePath: workspaceAsset("户外场景", "场景", "图3.png"),
  },
  {
    optionId: "coast-daylight",
    title: "海滨城市",
    referenceImagePath: workspaceAsset("户外场景", "场景", "图4.png"),
  },
];

