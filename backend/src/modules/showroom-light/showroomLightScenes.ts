import path from "node:path";

import { env } from "../../config/env";

export interface ShowroomLightScene {
  optionId: string;
  title: string;
  referenceImageUrl?: string;
  referenceImagePath?: string;
}

const workspaceAsset = (...segments: string[]) => path.resolve(env.rootDir, "../src/assets/img", ...segments);

export const showroomLightScenes: ShowroomLightScene[] = [
  {
    optionId: "white-studio",
    title: "经典白棚",
    referenceImagePath: workspaceAsset("展厅灯光", "经典白棚.png"),
  },
  {
    optionId: "glass-hall",
    title: "玻璃展厅",
    referenceImagePath: workspaceAsset("展厅灯光", "玻璃展厅.png"),
  },
  {
    optionId: "luxury-dark",
    title: "暗调奢华",
    referenceImagePath: workspaceAsset("展厅灯光", "暗调奢华.png"),
  },
  {
    optionId: "soft-top-light",
    title: "柔光灯顶",
    referenceImagePath: workspaceAsset("展厅灯光", "柔光灯顶.png"),
  },
  {
    optionId: "minimal-space",
    title: "极简留白",
    referenceImagePath: workspaceAsset("展厅灯光", "极简留白.png"),
  },
  {
    optionId: "wide-angle",
    title: "广角空间",
    referenceImagePath: workspaceAsset("展厅灯光", "广角空间.png"),
  },
];

export const getShowroomLightScene = (optionId?: string | null) =>
  showroomLightScenes.find((scene) => scene.optionId === optionId) ?? showroomLightScenes[0];
