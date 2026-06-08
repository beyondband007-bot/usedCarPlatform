import path from "node:path";

import { env } from "../../config/env";
import { sceneReferenceMediaUrls } from "../../shared/mediaUrls";
import type { LogoPlacement } from "../../shared/types";

const showroomSceneRefDir = path.resolve(env.sceneRefsDir, "showroom");

export interface ShowroomLightScene {
  optionId: string;
  title: string;
  referenceImageUrl?: string;
  referenceImagePath?: string;
  supportedLogoPlacements: LogoPlacement[];
  disabledLogoPlacementReasons?: Partial<Record<LogoPlacement, string>>;
}

const defaultLogoPlacements: LogoPlacement[] = ["plate", "wall"];

export const showroomLightScenes: ShowroomLightScene[] = [
  {
    optionId: "white-studio",
    title: "经典白棚",
    referenceImageUrl: sceneReferenceMediaUrls.showroom.whiteStudio,
    supportedLogoPlacements: defaultLogoPlacements,
  },
  {
    optionId: "glass-hall",
    title: "玻璃展厅",
    referenceImageUrl: sceneReferenceMediaUrls.showroom.glassHall,
    supportedLogoPlacements: defaultLogoPlacements,
  },
  {
    optionId: "luxury-dark",
    title: "暗调奢华",
    referenceImageUrl: sceneReferenceMediaUrls.showroom.luxuryDark,
    supportedLogoPlacements: defaultLogoPlacements,
  },
  {
    optionId: "soft-top-light",
    title: "柔光灯顶",
    referenceImageUrl: sceneReferenceMediaUrls.showroom.softTopLight,
    supportedLogoPlacements: defaultLogoPlacements,
  },
  {
    optionId: "minimal-space",
    title: "极简留白",
    referenceImageUrl: sceneReferenceMediaUrls.showroom.minimalSpace,
    supportedLogoPlacements: defaultLogoPlacements,
  },
  {
    optionId: "wide-angle",
    title: "广角空间",
    referenceImageUrl: sceneReferenceMediaUrls.showroom.wideAngle,
    supportedLogoPlacements: defaultLogoPlacements,
  },
  {
    optionId: "warm-beige-studio",
    title: "暖调米棚",
    referenceImagePath: path.join(
      showroomSceneRefDir,
      "workspace-showroom-scene-warm-beige.png",
    ),
    supportedLogoPlacements: defaultLogoPlacements,
  },
  {
    optionId: "dark-gray-halo",
    title: "深灰光晕",
    referenceImagePath: path.join(
      showroomSceneRefDir,
      "workspace-showroom-scene-dark-gray-halo.png",
    ),
    supportedLogoPlacements: defaultLogoPlacements,
  },
  {
    optionId: "charcoal-stone-wall",
    title: "炭灰岩墙",
    referenceImagePath: path.join(
      showroomSceneRefDir,
      "workspace-showroom-scene-charcoal-stone.png",
    ),
    supportedLogoPlacements: defaultLogoPlacements,
  },
  {
    optionId: "vertical-light-hall",
    title: "竖光展厅",
    referenceImagePath: path.join(
      showroomSceneRefDir,
      "workspace-showroom-scene-vertical-light.png",
    ),
    supportedLogoPlacements: defaultLogoPlacements,
  },
];

export const getShowroomLightScene = (optionId?: string | null) =>
  showroomLightScenes.find((scene) => scene.optionId === optionId) ?? showroomLightScenes[0];
