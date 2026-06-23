import type { BatchItemKind, BatchVisualConfig } from "../batch-new/batchTypes";

const BASE_GENERATION_POINTS = 30;
const SHORT_VIDEO_POINTS = 2000;
const VIDEO_GENERATION_POINTS_PER_SECOND = 150;
const BATCH_LIGHT_CONSISTENCY_POINTS = 10;
const BATCH_PAINT_REFRESH_POINTS = 10;
const BATCH_INTERIOR_COLLAGE_POINTS = 10;
const BATCH_WALL_LOGO_SCENE_POINTS = 30;

const formatPoints = (points: number) => `${points.toFixed(4)}`;

const isEnabled = (value: unknown) => value === true;

export const singleImageGenerationPoints = (imageCount = 1) =>
  formatPoints(Math.max(0, imageCount) * BASE_GENERATION_POINTS);

export const shortVideoGenerationPoints = (videoCount = 1) =>
  formatPoints(Math.max(0, videoCount) * SHORT_VIDEO_POINTS);

export const videoGenerationPointsByAudioSeconds = (audioSeconds = 15) =>
  formatPoints(Math.max(0, audioSeconds) * VIDEO_GENERATION_POINTS_PER_SECOND);

export const batchExteriorItemGenerationPoints = (config: BatchVisualConfig) => {
  const lightConsistencyPoints =
    isEnabled(config.enableLightConsistency) || isEnabled(config.lightConsistency)
      ? BATCH_LIGHT_CONSISTENCY_POINTS
      : 0;
  const paintRefreshPoints =
    isEnabled(config.enablePaintRefresh) || isEnabled(config.paintRefresh)
      ? BATCH_PAINT_REFRESH_POINTS
      : 0;
  const interiorCollagePoints =
    isEnabled(config.enableInteriorCollage) || isEnabled(config.interiorCollage)
      ? BATCH_INTERIOR_COLLAGE_POINTS
      : 0;

  return formatPoints(
    BASE_GENERATION_POINTS +
      lightConsistencyPoints +
      paintRefreshPoints +
      interiorCollagePoints,
  );
};

export const batchInteriorItemGenerationPoints = (sourceImageCount = 1) =>
  formatPoints(BASE_GENERATION_POINTS * Math.max(1, sourceImageCount));

export const batchItemGenerationPoints = (
  config: BatchVisualConfig,
  itemKind: BatchItemKind = "exterior",
  sourceImageCount = 1,
) => {
  if (itemKind !== "exterior") {
    return batchInteriorItemGenerationPoints(sourceImageCount);
  }

  return batchExteriorItemGenerationPoints(config);
};

export const batchWallLogoSceneGenerationPoints = () =>
  formatPoints(BATCH_WALL_LOGO_SCENE_POINTS);

export const generationPointRuleSummary = {
  baseGenerationPoints: BASE_GENERATION_POINTS,
  shortVideoPoints: SHORT_VIDEO_POINTS,
  videoGenerationPointsPerSecond: VIDEO_GENERATION_POINTS_PER_SECOND,
  batchLightConsistencyPoints: BATCH_LIGHT_CONSISTENCY_POINTS,
  batchPaintRefreshPoints: BATCH_PAINT_REFRESH_POINTS,
  batchInteriorCollagePoints: BATCH_INTERIOR_COLLAGE_POINTS,
  batchWallLogoScenePoints: BATCH_WALL_LOGO_SCENE_POINTS,
  ignoredBatchOptions: ["enableSceneChange", "useRecentLogo", "enableInteriorClean"],
};
