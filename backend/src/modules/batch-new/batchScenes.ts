import path from "node:path";

import { env } from "../../config/env";

const workspaceAsset = (...segments: string[]) => path.resolve(env.rootDir, "../src/assets/img", ...segments);

export interface BatchScene {
  optionId: string;
  title: string;
  referenceImageUrl?: string;
  referenceImagePath?: string;
}

export const batchScenes: BatchScene[] = [
  {
    optionId: "white-studio",
    title: "经典白棚",
    referenceImagePath: workspaceAsset("展厅灯光", "教程图片", "经典白棚.png"),
  },
  {
    optionId: "glass-hall",
    title: "玻璃展厅",
    referenceImagePath: workspaceAsset("展厅灯光", "教程图片", "玻璃展厅.png"),
  },
  {
    optionId: "luxury-dark",
    title: "暗调豪华",
    referenceImagePath: workspaceAsset("展厅灯光", "教程图片", "暗调豪华.png"),
  },
  {
    optionId: "soft-top-light",
    title: "柔光灯顶",
    referenceImagePath: workspaceAsset("展厅灯光", "教程图片", "柔光灯顶.png"),
  },
  {
    optionId: "tree-park",
    title: "林荫公园",
    referenceImagePath: workspaceAsset("户外场景", "教程", "林荫公园.png"),
  },
  {
    optionId: "mountain-lake",
    title: "山野湖畔",
    referenceImagePath: workspaceAsset("户外场景", "教程", "山野湖畔.png"),
  },
  {
    optionId: "city-block",
    title: "城市街区",
    referenceImagePath: workspaceAsset("户外场景", "教程", "城市街区.png"),
  },
  {
    optionId: "coast-daylight",
    title: "海滨城市",
    referenceImagePath: workspaceAsset("户外场景", "教程", "海滨城市.png"),
  },
];

export const resolveBatchScene = (optionId?: string | null, sceneIndex?: number | null) =>
  batchScenes.find((scene) => scene.optionId === optionId) ??
  (typeof sceneIndex === "number" ? batchScenes[sceneIndex] : undefined) ??
  batchScenes[0];
