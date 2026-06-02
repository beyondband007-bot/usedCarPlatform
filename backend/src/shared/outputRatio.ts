import { errors } from "./errors";
import type { OutputRatio } from "./types";

export const outputRatios = ["auto", "1:1", "3:4", "4:3", "9:16", "16:9"] as const;

export const isOutputRatio = (value: unknown): value is OutputRatio =>
  typeof value === "string" && outputRatios.includes(value as OutputRatio);

export const resolveOutputRatio = (
  value: unknown,
  defaultRatio: OutputRatio = "16:9",
): OutputRatio => {
  if (value === undefined || value === null || value === "") return defaultRatio;
  if (isOutputRatio(value)) return value;
  throw errors.invalidParameter("outputRatio must be one of auto, 1:1, 3:4, 4:3, 9:16, 16:9", {
    outputRatio: value,
  });
};

export const appendOutputRatioPrompt = (prompt: string, outputRatio: OutputRatio) =>
  `${prompt}\n\n输出画幅比例必须严格遵循 ${outputRatio}，不要在提示词中固定为其他比例。`;
