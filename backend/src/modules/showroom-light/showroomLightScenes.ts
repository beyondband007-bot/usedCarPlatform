import { sceneReferenceMediaUrls } from "../../shared/mediaUrls";

export interface ShowroomLightScene {
  optionId: string;
  title: string;
  referenceImageUrl?: string;
  referenceImagePath?: string;
}

export const showroomLightScenes: ShowroomLightScene[] = [
  {
    optionId: "white-studio",
    title: "经典白棚",
    referenceImageUrl: sceneReferenceMediaUrls.showroom.whiteStudio,
  },
  {
    optionId: "glass-hall",
    title: "玻璃展厅",
    referenceImageUrl: sceneReferenceMediaUrls.showroom.glassHall,
  },
  {
    optionId: "luxury-dark",
    title: "暗调奢华",
    referenceImageUrl: sceneReferenceMediaUrls.showroom.luxuryDark,
  },
  {
    optionId: "soft-top-light",
    title: "柔光灯顶",
    referenceImageUrl: sceneReferenceMediaUrls.showroom.softTopLight,
  },
  {
    optionId: "minimal-space",
    title: "极简留白",
    referenceImageUrl: sceneReferenceMediaUrls.showroom.minimalSpace,
  },
  {
    optionId: "wide-angle",
    title: "广角空间",
    referenceImageUrl: sceneReferenceMediaUrls.showroom.wideAngle,
  },
];

export const getShowroomLightScene = (optionId?: string | null) =>
  showroomLightScenes.find((scene) => scene.optionId === optionId) ?? showroomLightScenes[0];
