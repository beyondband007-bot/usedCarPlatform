import {
  batchItemGenerationPoints,
  batchWallLogoSceneGenerationPoints,
  shortVideoGenerationPoints,
  singleImageGenerationPoints,
} from "./generationPointRules";

export type CreditFunctionCatalogItem = {
  code: string;
  name: string;
  description: string;
  chargeMode: "fixed" | "dynamic" | "estimate_required";
  defaultPoints: string;
  status: "active" | "inactive";
};

const singleImageFunctions: CreditFunctionCatalogItem[] = [
  ["showroom-light", "Showroom Light", "Showroom scene image generation"],
  ["outdoor-scene", "Outdoor Scene", "Outdoor scene image generation"],
  ["road-motion", "Road Motion", "Road motion image generation"],
  ["sky-studio", "Sky Studio", "Sky studio image generation"],
  ["paint-refresh", "Paint Refresh", "Paint refresh image generation"],
  ["light-consistency", "Light Consistency", "Light consistency image generation"],
  ["interior-clean", "Interior Clean", "Interior clean image generation"],
  ["interior-collage", "Interior Collage", "Interior collage image generation"],
  ["watermark-remove", "Watermark Remove", "Watermark removal image generation"],
  ["creative-image", "Creative Image", "Creative image generation"],
].map(([code, name, description]) => ({
  code,
  name,
  description,
  chargeMode: "estimate_required",
  defaultPoints: singleImageGenerationPoints(),
  status: "active",
}));

export const creditFunctionCatalog: CreditFunctionCatalogItem[] = [
  ...singleImageFunctions,
  {
    code: "short-video",
    name: "Short Video",
    description: "Short video generation",
    chargeMode: "estimate_required",
    defaultPoints: shortVideoGenerationPoints(),
    status: "active",
  },
  {
    code: "batch-new-exterior",
    name: "Batch New Exterior Item",
    description: "Batch exterior image generation item",
    chargeMode: "estimate_required",
    defaultPoints: batchItemGenerationPoints({}),
    status: "active",
  },
  {
    code: "batch-new-wall-logo-scene",
    name: "Batch New Wall Logo Scene",
    description: "Batch wall-logo branded scene generation",
    chargeMode: "estimate_required",
    defaultPoints: batchWallLogoSceneGenerationPoints(),
    status: "active",
  },
  {
    code: "batch-new-interior",
    name: "Batch New Interior Item",
    description: "Batch interior image generation item",
    chargeMode: "estimate_required",
    defaultPoints: batchItemGenerationPoints({}),
    status: "active",
  },
];
