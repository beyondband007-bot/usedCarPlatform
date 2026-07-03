import { videoGenerationLanguages } from "./videoGenerationLanguage";

export type VideoTemplateType =
  | "dealership"
  | "single-car"
  | "promotion"
  | "market"
  | "vehicle-ad";

export type VideoTemplateStyle =
  | "calm"
  | "lively"
  | "professional"
  | "humorous";

export type VideoGenerationOutputRatio = "9:16" | "16:9";

export type VideoTemplateFieldType =
  | "text"
  | "asset_ids"
  | "digital_human"
  | "language";

export interface VideoTemplateInputRequirement {
  key: string;
  label: string;
  type: VideoTemplateFieldType;
  required: boolean;
  minCount?: number;
  maxCount?: number;
  minLength?: number;
  maxLength?: number;
  acceptedPurposes?: string[];
  options?: Array<{
    value: string;
    label: string;
  }>;
  placeholder?: string;
}

export interface VideoTemplateDefinition {
  referenceMaterialId: string;
  type: VideoTemplateType;
  style: VideoTemplateStyle;
  outputRatio: VideoGenerationOutputRatio;
  badge: "hot" | "new" | null;
  inputRequirements: VideoTemplateInputRequirement[];
}

export interface TemplateInputValidationIssue {
  field: string;
  code:
    | "required"
    | "invalid_type"
    | "too_short"
    | "too_long"
    | "too_few"
    | "too_many"
    | "unsupported_value";
  message: string;
}

const digitalHumanRequirement: VideoTemplateInputRequirement = {
  key: "digitalHumanId",
  label: "数字人",
  type: "digital_human",
  required: true,
};

const languageRequirement: VideoTemplateInputRequirement = {
  key: "language",
  label: "口播语言",
  type: "language",
  required: true,
  options: videoGenerationLanguages.map(({ value, label }) => ({
    value,
    label,
  })),
};

const brandRequirement: VideoTemplateInputRequirement = {
  key: "brand",
  label: "品牌",
  type: "text",
  required: true,
  minLength: 1,
  maxLength: 30,
  placeholder: "如：丰田",
};

const modelYearRequirement: VideoTemplateInputRequirement = {
  key: "modelYear",
  label: "年款",
  type: "text",
  required: true,
  minLength: 4,
  maxLength: 4,
  placeholder: "如：2025",
};

const displacementRequirement: VideoTemplateInputRequirement = {
  key: "displacement",
  label: "排量/动力",
  type: "text",
  required: true,
  minLength: 1,
  maxLength: 20,
  placeholder: "如：2.0T、1.5L、纯电",
};

const salesNameRequirement: VideoTemplateInputRequirement = {
  key: "salesName",
  label: "车型",
  type: "text",
  required: true,
  minLength: 1,
  maxLength: 50,
  placeholder: "如：运动版",
};

const seriesRequirement: VideoTemplateInputRequirement = {
  key: "series",
  label: "车系",
  type: "text",
  required: true,
  minLength: 1,
  maxLength: 50,
  placeholder: "如：凯美瑞",
};

const exteriorRequirement: VideoTemplateInputRequirement = {
  key: "vehicleExteriorAssetIds",
  label: "车辆外观图",
  type: "asset_ids",
  required: true,
  minCount: 1,
  maxCount: 5,
  acceptedPurposes: ["car_exterior"],
};

const interiorRequirement: VideoTemplateInputRequirement = {
  key: "vehicleInteriorAssetIds",
  label: "车辆内饰图",
  type: "asset_ids",
  required: false,
  minCount: 0,
  maxCount: 5,
  acceptedPurposes: ["car_interior"],
};

const userReferenceRequirement: VideoTemplateInputRequirement = {
  key: "userReferenceAssetIds",
  label: "补充参考图",
  type: "asset_ids",
  required: false,
  minCount: 0,
  maxCount: 4,
  acceptedPurposes: [
    "video_reference_image",
    "car_exterior",
    "car_interior",
  ],
};

const singleCarRequirements = (): VideoTemplateInputRequirement[] => [
  exteriorRequirement,
  interiorRequirement,
  digitalHumanRequirement,
  brandRequirement,
  modelYearRequirement,
  displacementRequirement,
  salesNameRequirement,
  seriesRequirement,
  languageRequirement,
  userReferenceRequirement,
];

const promotionRequirements = (): VideoTemplateInputRequirement[] => [
  ...singleCarRequirements(),
  {
    key: "promotionText",
    label: "优惠信息",
    type: "text",
    required: true,
    minLength: 2,
    maxLength: 160,
    placeholder: "如：限时优惠、金融方案或到店权益",
  },
];

const dealershipRequirements = (): VideoTemplateInputRequirement[] => [
  {
    key: "dealershipImageAssetIds",
    label: "车场或展厅图片",
    type: "asset_ids",
    required: true,
    minCount: 1,
    maxCount: 6,
    acceptedPurposes: ["video_reference_image"],
  },
  digitalHumanRequirement,
  {
    key: "dealershipName",
    label: "车场名称",
    type: "text",
    required: true,
    minLength: 2,
    maxLength: 60,
    placeholder: "如：靠谱二手车展厅",
  },
  languageRequirement,
  {
    key: "featuredVehicleNames",
    label: "主推车型",
    type: "text",
    required: false,
    maxLength: 160,
    placeholder: "可填写多个主推车型",
  },
  userReferenceRequirement,
];

const vehicleAdEffectStyleRequirement: VideoTemplateInputRequirement = {
  key: "effectStyle",
  label: "generation effect",
  type: "text",
  required: true,
  options: [
    { value: "premium", label: "高级质感" },
    { value: "speed", label: "速度动感" },
    { value: "lighting", label: "灯光氛围" },
  ],
  placeholder: "premium / speed / lighting",
};

const vehicleAdRequirements = (): VideoTemplateInputRequirement[] => [
  exteriorRequirement,
  interiorRequirement,
  userReferenceRequirement,
  vehicleAdEffectStyleRequirement,
];

const definitions: VideoTemplateDefinition[] = [
  {
    referenceMaterialId: "ref-video-017",
    type: "single-car",
    style: "professional",
    outputRatio: "9:16",
    badge: "new",
    inputRequirements: singleCarRequirements(),
  },
  {
    referenceMaterialId: "ref-video-018",
    type: "single-car",
    style: "professional",
    outputRatio: "9:16",
    badge: "new",
    inputRequirements: singleCarRequirements(),
  },
  {
    referenceMaterialId: "ref-video-016",
    type: "single-car",
    style: "professional",
    outputRatio: "9:16",
    badge: "new",
    inputRequirements: singleCarRequirements(),
  },
  {
    referenceMaterialId: "ref-video-004",
    type: "single-car",
    style: "professional",
    outputRatio: "9:16",
    badge: "new",
    inputRequirements: singleCarRequirements(),
  },
  {
    referenceMaterialId: "ref-video-006",
    type: "dealership",
    style: "professional",
    outputRatio: "9:16",
    badge: "new",
    inputRequirements: dealershipRequirements(),
  },
  {
    referenceMaterialId: "ref-video-003",
    type: "dealership",
    style: "calm",
    outputRatio: "9:16",
    badge: null,
    inputRequirements: dealershipRequirements(),
  },
  {
    referenceMaterialId: "ref-video-001",
    type: "dealership",
    style: "lively",
    outputRatio: "16:9",
    badge: "hot",
    inputRequirements: dealershipRequirements(),
  },
  {
    referenceMaterialId: "ref-video-002",
    type: "dealership",
    style: "professional",
    outputRatio: "9:16",
    badge: null,
    inputRequirements: dealershipRequirements(),
  },
  {
    referenceMaterialId: "ref-video-008",
    type: "dealership",
    style: "professional",
    outputRatio: "9:16",
    badge: "new",
    inputRequirements: dealershipRequirements(),
  },
  {
    referenceMaterialId: "ref-video-009",
    type: "dealership",
    style: "professional",
    outputRatio: "9:16",
    badge: "new",
    inputRequirements: dealershipRequirements(),
  },
  {
    referenceMaterialId: "ref-video-010",
    type: "dealership",
    style: "professional",
    outputRatio: "9:16",
    badge: "new",
    inputRequirements: dealershipRequirements(),
  },
  {
    referenceMaterialId: "ref-video-011",
    type: "dealership",
    style: "professional",
    outputRatio: "9:16",
    badge: "new",
    inputRequirements: dealershipRequirements(),
  },
  {
    referenceMaterialId: "ref-video-012",
    type: "dealership",
    style: "professional",
    outputRatio: "9:16",
    badge: "new",
    inputRequirements: dealershipRequirements(),
  },
  {
    referenceMaterialId: "ref-video-013",
    type: "dealership",
    style: "professional",
    outputRatio: "16:9",
    badge: "new",
    inputRequirements: dealershipRequirements(),
  },
  {
    referenceMaterialId: "ref-video-014",
    type: "dealership",
    style: "professional",
    outputRatio: "9:16",
    badge: "new",
    inputRequirements: dealershipRequirements(),
  },
  {
    referenceMaterialId: "ref-video-015",
    type: "dealership",
    style: "professional",
    outputRatio: "9:16",
    badge: "new",
    inputRequirements: dealershipRequirements(),
  },
  {
    referenceMaterialId: "ref-video-005",
    type: "vehicle-ad",
    style: "professional",
    outputRatio: "9:16",
    badge: "new",
    inputRequirements: vehicleAdRequirements(),
  },
  {
    referenceMaterialId: "ref-video-007",
    type: "single-car",
    style: "professional",
    outputRatio: "9:16",
    badge: "new",
    inputRequirements: singleCarRequirements(),
  },
  {
    referenceMaterialId: "ref-video-019",
    type: "single-car",
    style: "professional",
    outputRatio: "9:16",
    badge: "new",
    inputRequirements: singleCarRequirements(),
  },
  {
    referenceMaterialId: "ref-video-020",
    type: "single-car",
    style: "professional",
    outputRatio: "9:16",
    badge: "new",
    inputRequirements: singleCarRequirements(),
  },
];

const definitionByReferenceMaterialId = new Map(
  definitions.map((definition) => [
    definition.referenceMaterialId,
    definition,
  ]),
);

export const videoTemplateTypeLabels: Record<VideoTemplateType, string> = {
  dealership: "车场介绍",
  "single-car": "单车品介绍",
  promotion: "促销活动",
  market: "行情资讯",
  "vehicle-ad": "车辆广告",
};

export const videoTemplateStyleLabels: Record<VideoTemplateStyle, string> = {
  calm: "沉稳",
  lively: "活泼",
  professional: "专业",
  humorous: "幽默",
};

export const videoTemplateCapabilities = [
  {
    type: "single-car" as const,
    label: videoTemplateTypeLabels["single-car"],
    status: "available" as const,
    generationReadiness: "ready" as const,
  },
  {
    type: "dealership" as const,
    label: videoTemplateTypeLabels.dealership,
    status: "available" as const,
    generationReadiness: "ready" as const,
  },
  {
    type: "promotion" as const,
    label: videoTemplateTypeLabels.promotion,
    status: "available" as const,
    generationReadiness: "ready" as const,
  },
  {
    type: "vehicle-ad" as const,
    label: videoTemplateTypeLabels["vehicle-ad"],
    status: "available" as const,
    generationReadiness: "ready" as const,
  },
  {
    type: "market" as const,
    label: videoTemplateTypeLabels.market,
    status: "coming_soon" as const,
    generationReadiness: "unavailable" as const,
    reason: "当前没有已完成风格提取的行情资讯参考素材",
  },
];

export const listVideoTemplateDefinitions = () => definitions;

export const getVideoTemplateDefinition = (referenceMaterialId: string) =>
  definitionByReferenceMaterialId.get(referenceMaterialId) ?? null;

const stringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : null;

export const validateVideoTemplateInputs = (
  definition: VideoTemplateDefinition,
  value: unknown,
) => {
  const input =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const issues: TemplateInputValidationIssue[] = [];

  for (const requirement of definition.inputRequirements) {
    const fieldValue = input[requirement.key];

    if (requirement.type === "asset_ids") {
      const assetIds = stringArray(fieldValue);
      if (fieldValue !== undefined && assetIds === null) {
        issues.push({
          field: requirement.key,
          code: "invalid_type",
          message: `${requirement.label}必须是素材ID数组`,
        });
        continue;
      }
      const count = assetIds?.length ?? 0;
      if (requirement.required && count === 0) {
        issues.push({
          field: requirement.key,
          code: "required",
          message: `请提供${requirement.label}`,
        });
        continue;
      }
      if (requirement.minCount !== undefined && count < requirement.minCount) {
        issues.push({
          field: requirement.key,
          code: "too_few",
          message: `${requirement.label}至少需要${requirement.minCount}个素材`,
        });
      }
      if (requirement.maxCount !== undefined && count > requirement.maxCount) {
        issues.push({
          field: requirement.key,
          code: "too_many",
          message: `${requirement.label}最多支持${requirement.maxCount}个素材`,
        });
      }
      continue;
    }

    if (fieldValue === undefined || fieldValue === null || fieldValue === "") {
      if (requirement.required) {
        issues.push({
          field: requirement.key,
          code: "required",
          message: `请填写${requirement.label}`,
        });
      }
      continue;
    }
    if (typeof fieldValue !== "string") {
      issues.push({
        field: requirement.key,
        code: "invalid_type",
        message: `${requirement.label}必须是字符串`,
      });
      continue;
    }

    const normalized = fieldValue.trim();
    if (
      requirement.minLength !== undefined &&
      normalized.length < requirement.minLength
    ) {
      issues.push({
        field: requirement.key,
        code: "too_short",
        message: `${requirement.label}至少需要${requirement.minLength}个字符`,
      });
    }
    if (
      requirement.maxLength !== undefined &&
      normalized.length > requirement.maxLength
    ) {
      issues.push({
        field: requirement.key,
        code: "too_long",
        message: `${requirement.label}最多支持${requirement.maxLength}个字符`,
      });
    }
    if (
      requirement.options &&
      !requirement.options.some((option) => option.value === normalized)
    ) {
      issues.push({
        field: requirement.key,
        code: "unsupported_value",
        message: `${requirement.label}暂不支持该选项`,
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};

export const videoGenerationWorkflowContract = {
  contractVersion: 3,
  identifiers: {
    templateId: "前端模板标识；当前与referenceMaterialId使用同一个值",
    referenceMaterialId: "兼容旧接口的预设风格素材标识",
    digitalHumanId: "数字人标识",
    assetId: "用户上传素材标识",
    scriptDraftId: "口播草稿标识",
    taskId: "视频生成任务标识",
  },
  fixedOutput: {
    durationSeconds: 15,
    resolution: "720p",
    language: "Chinese",
    languageMode: "selectable",
  },
  outputRatioPolicy: {
    mode: "template_locked",
    supportedRatios: ["16:9", "9:16"] as VideoGenerationOutputRatio[],
  },
  vehicleNameComposition: {
    canonicalField: "vehicleName",
    structuredFields: [
      "brand",
      "modelYear",
      "displacement",
      "salesName",
      "series",
    ],
    frontendAliases: {
      nian: "modelYear",
      paiLiang: "displacement",
    },
    behavior:
      "新前端提交结构化车型字段，后端自动生成vehicleName；旧调用仍可直接提交vehicleName",
  },
  supportedLanguages: videoGenerationLanguages.map(({ value, label }) => ({
    value,
    label,
    status: "available" as const,
  })),
  workflow: [
    {
      step: "select_template",
      endpoint: "GET /api/v1/modules/video-generation/templates",
    },
    {
      step: "load_digital_humans",
      endpoint: "GET /api/v1/modules/video-generation/digital-humans",
    },
    {
      step: "upload_assets",
      endpoint: "POST /api/v1/assets/upload",
    },
    {
      step: "create_script_draft",
      endpoint: "POST /api/v1/modules/video-generation/script-drafts",
    },
    {
      step: "create_video_task",
      endpoint: "POST /api/v1/modules/video-generation/tasks",
    },
    {
      step: "poll_task",
      endpoint:
        "GET /api/v1/modules/video-generation/tasks/{taskId}",
    },
    {
      step: "cancel_task",
      endpoint:
        "POST /api/v1/modules/video-generation/tasks/{taskId}/cancel",
    },
    {
      step: "list_history",
      endpoint: "GET /api/v1/modules/video-generation/tasks",
    },
    {
      step: "regenerate",
      endpoint:
        "POST /api/v1/modules/video-generation/tasks/{taskId}/regenerate",
    },
  ],
  templateCapabilities: videoTemplateCapabilities,
} as const;
