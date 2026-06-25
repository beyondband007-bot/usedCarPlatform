import { errors } from "../../shared/errors";
import type { BatchItemKind, BatchVisualConfig } from "./batchTypes";

const enabled = (value: unknown) => value === true;

export const splitInteriorAssetIds = (assetIds: string[]) => {
  const count = assetIds.length;
  if (count < 2 || count > 10) {
    throw errors.invalidParameter("interior collage requires 2-10 images", {
      count,
    });
  }

  const sizes =
    count <= 4
      ? [count]
      : count <= 8
        ? [Math.ceil(count / 2), Math.floor(count / 2)]
        : count === 9
          ? [3, 3, 3]
          : [4, 3, 3];
  let cursor = 0;
  return sizes.map((size) => {
    const group = assetIds.slice(cursor, cursor + size);
    cursor += size;
    return group;
  });
};

export const resolveInteriorProcessingKind = (
  config: BatchVisualConfig,
): BatchItemKind | null => {
  const clean =
    enabled(config.enableInteriorClean) || enabled(config.interiorEnhance);
  const scene = enabled(config.enableInteriorSceneChange);
  if (scene && clean) return "interior_scene_clean";
  if (scene) return "interior_scene";
  if (clean) return "interior_clean";
  return null;
};

export const planInteriorTasks = (
  config: BatchVisualConfig,
  assetIds: string[],
) => {
  const processingKind = resolveInteriorProcessingKind(config);
  const collage =
    enabled(config.enableInteriorCollage) || enabled(config.interiorCollage);
  return {
    processingKind,
    processingItems: processingKind
      ? assetIds.map((assetId) => ({ itemKind: processingKind, assetIds: [assetId] }))
      : [],
    collageItems: collage
      ? splitInteriorAssetIds(assetIds).map((group) => ({
          itemKind: "interior_collage" as const,
          assetIds: group,
        }))
      : [],
  };
};
