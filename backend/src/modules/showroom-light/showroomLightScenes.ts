import { sceneReferenceMediaUrls } from "../../shared/mediaUrls";
import type { LogoPlacement } from "../../shared/types";

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
];

export const getShowroomLightScene = (optionId?: string | null) =>
  showroomLightScenes.find((scene) => scene.optionId === optionId) ?? showroomLightScenes[0];
