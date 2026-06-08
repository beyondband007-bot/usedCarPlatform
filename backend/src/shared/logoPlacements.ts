import type { LogoPlacement } from "./types";

export type LogoPlacementMode = "none" | "plate" | "wall" | "plate_wall";

const allowedLogoPlacements = new Set<LogoPlacement>(["plate", "wall"]);

const normalizePlacementArray = (value: unknown): LogoPlacement[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<LogoPlacement>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = item.trim();
    if (allowedLogoPlacements.has(normalized as LogoPlacement)) {
      seen.add(normalized as LogoPlacement);
    }
  }
  return [...seen];
};

export const resolveLogoPlacements = (input: {
  enabled?: boolean;
  logoPlacements?: unknown;
  extraLogoPlacements?: unknown;
  legacyDefault?: LogoPlacement[];
}): LogoPlacement[] => {
  if (!input.enabled) return [];

  const explicit = normalizePlacementArray(input.logoPlacements);
  if (explicit.length) return explicit;

  const extra = normalizePlacementArray(input.extraLogoPlacements);
  if (extra.length) return extra;

  return input.legacyDefault ?? ["plate"];
};

export const logoPlacementMode = (placements: LogoPlacement[]): LogoPlacementMode => {
  const set = new Set(placements);
  if (set.has("plate") && set.has("wall")) return "plate_wall";
  if (set.has("plate")) return "plate";
  if (set.has("wall")) return "wall";
  return "none";
};

export const unsupportedLogoPlacements = (
  requested: LogoPlacement[],
  supported: readonly LogoPlacement[],
) => {
  const supportedSet = new Set(supported);
  return requested.filter((placement) => !supportedSet.has(placement));
};
