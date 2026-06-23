export const BATCH_BASE_POINTS = 30;
export const BATCH_OPTION_POINTS = 10;

export type BatchPointsConfig = {
  lightConsistency?: boolean;
  paintRefresh?: boolean;
  interiorCollage?: boolean;
};

export function resolveBatchExteriorItemPoints(config?: BatchPointsConfig | null) {
  if (!config) return BATCH_BASE_POINTS;

  return (
    BATCH_BASE_POINTS +
    (config.lightConsistency ? BATCH_OPTION_POINTS : 0) +
    (config.paintRefresh ? BATCH_OPTION_POINTS : 0) +
    (config.interiorCollage ? BATCH_OPTION_POINTS : 0)
  );
}

export function resolveBatchInteriorItemPoints(interiorImageCount: number) {
  return BATCH_BASE_POINTS * Math.max(0, interiorImageCount);
}

export function resolveBatchEstimatedCost(input: {
  exteriorCount: number;
  interiorCount: number;
  config?: BatchPointsConfig | null;
}) {
  return (
    input.exteriorCount * resolveBatchExteriorItemPoints(input.config) +
    resolveBatchInteriorItemPoints(input.interiorCount)
  );
}
