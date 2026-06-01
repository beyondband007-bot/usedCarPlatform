import type { BatchVisualConfig } from "../batch-new/batchTypes";

const BASE_GENERATION_POINTS = 30;
const EXTRA_BATCH_OPTION_POINTS = 10;

const formatPoints = (points: number) => `${points.toFixed(4)}`;

const isEnabled = (value: unknown) => value === true;

export const singleGenerationPoints = () => formatPoints(BASE_GENERATION_POINTS);

export const batchVisualOptionCount = (config: BatchVisualConfig) =>
  [
    isEnabled(config.enableSceneChange),
    isEnabled(config.enableLightConsistency) || isEnabled(config.lightConsistency),
    isEnabled(config.enablePaintRefresh) || isEnabled(config.paintRefresh),
    isEnabled(config.enableInteriorClean) || isEnabled(config.interiorEnhance),
  ].filter(Boolean).length;

export const batchItemGenerationPoints = (config: BatchVisualConfig) => {
  const optionCount = batchVisualOptionCount(config);
  const extraOptions = Math.max(0, optionCount - 1);
  return formatPoints(BASE_GENERATION_POINTS + extraOptions * EXTRA_BATCH_OPTION_POINTS);
};

export const generationPointRuleSummary = {
  baseGenerationPoints: BASE_GENERATION_POINTS,
  extraBatchOptionPoints: EXTRA_BATCH_OPTION_POINTS,
  ignoredBatchOptions: ["useRecentLogo"],
};
