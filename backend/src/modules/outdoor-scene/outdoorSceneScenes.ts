import type { SceneOption } from "../scene-common/sceneModuleFactory";
import { sceneReferenceMediaUrls } from "../../shared/mediaUrls";

export const outdoorSceneScenes: SceneOption[] = [
  {
    optionId: "tree-park",
    title: "林荫公园",
    referenceImageUrl: sceneReferenceMediaUrls.outdoor.treePark,
  },
  {
    optionId: "mountain-lake",
    title: "山野湖畔",
    referenceImageUrl: sceneReferenceMediaUrls.outdoor.mountainLake,
  },
  {
    optionId: "city-block",
    title: "城市街区",
    referenceImageUrl: sceneReferenceMediaUrls.outdoor.cityBlock,
  },
  {
    optionId: "coast-daylight",
    title: "海滨城市",
    referenceImageUrl: sceneReferenceMediaUrls.outdoor.coastDaylight,
  },
];
