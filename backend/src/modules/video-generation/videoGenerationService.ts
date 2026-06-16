import fs from "node:fs/promises";
import path from "node:path";

import { env } from "../../config/env";
import { arkClient } from "../../providers/ark/arkClient";
import type { ArkReferenceContent } from "../../providers/ark/arkTypes";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import {
  VIDEO_GENERATION_RESOLUTION,
  type AssetPurpose,
} from "../../shared/types";
import { deepSeekClient } from "../../providers/deepseek/deepseekClient";
import { minimaxClient } from "../../providers/minimax/minimaxClient";
import { assetsRepository, type AssetRecord } from "../assets/assetsRepository";
import {
  freezeGenerationBilling,
  markGenerationBillingRefundFailed,
  refundFrozenGenerationBilling,
  toBillingResponseFields,
  type FrozenGenerationBilling,
} from "../billing/billingLifecycle";
import type { BillingRequestContext } from "../billing/billingIdentity";
import { shortVideoGenerationPoints } from "../billing/generationPointRules";
import { assertCanStartGeneration } from "../subscription/subscriptionService";
import { tasksRepository } from "../tasks/tasksRepository";
import { tasksService } from "../tasks/tasksService";
import { digitalHumanVoiceRepository } from "./digitalHumanVoiceRepository";
import {
  getVideoGenerationScriptLengthRule,
  getVideoGenerationLanguageLabel,
  normalizeVideoGenerationLanguage,
  type VideoGenerationLanguage,
} from "./videoGenerationLanguage";
import { arkVirtualAssetService } from "./arkVirtualAssetService";
import { videoScriptDraftRepository } from "./videoScriptDraftRepository";
import {
  getVideoTemplateDefinition,
  listVideoTemplateDefinitions,
  validateVideoTemplateInputs,
  videoGenerationWorkflowContract,
  videoTemplateStyleLabels,
  videoTemplateTypeLabels,
  type VideoTemplateStyle,
  type VideoTemplateType,
} from "./videoTemplateCatalog";

type DigitalHumanGender = "female" | "male";

interface DigitalHumanRecord {
  id: string;
  name: string;
  gender: DigitalHumanGender;
  ageStyle: string;
  imagePath: string;
  frontPreviewStrategy: string;
  status: "active" | "inactive";
  sortOrder: number;
  presetVoice?: {
    status: "ready" | "not_configured";
    voiceId: string;
    displayName?: string;
    languageBoost?: string;
    speed?: number;
    vol?: number;
    pitch?: number;
    model?: string;
    sourceImagePath?: string;
  };
}

interface DigitalHumanManifest {
  manifestVersion: number;
  items: DigitalHumanRecord[];
}

interface ReferenceMaterialRecord {
  id: string;
  title: string;
  videoType: string;
  referenceRole: string;
  previewImagePath?: string;
  analysisFramePaths?: string[];
  media: {
    duration: string;
    width: number;
    height: number;
    frameRate: string;
  };
  styleJson: {
    videoType: string;
    referenceRole: string;
    styleTags: string[];
    sceneStyle: string;
    visualTone: string;
    lighting: string;
    cameraLanguage: string;
    subjectComposition: string;
    pacing: string;
    applicableCarTypes: string[];
    avoid: string[];
  };
  stylePrompt: string;
  scenePrompt?: string;
  shotPlan15s?: Array<{
    timeRange: string;
    visual: string;
    assetRole?: string;
  }>;
  extractionStatus: "pending" | "completed";
}

interface ReferenceMaterialManifest {
  manifestVersion: number;
  materials: ReferenceMaterialRecord[];
}

interface CreateScriptDraftInput {
  vehicleName?: unknown;
  brand?: unknown;
  modelYear?: unknown;
  nian?: unknown;
  displacement?: unknown;
  paiLiang?: unknown;
  salesName?: unknown;
  series?: unknown;
  digitalHumanId?: unknown;
  templateId?: unknown;
  referenceMaterialId?: unknown;
  language?: unknown;
  vehicleExteriorAssetIds?: unknown;
  vehicleInteriorAssetIds?: unknown;
  userReferenceAssetIds?: unknown;
  durationSeconds?: unknown;
  sellingPointHints?: unknown;
  vehicleImageSummary?: unknown;
  promotionText?: unknown;
  dealershipName?: unknown;
  dealershipImageAssetIds?: unknown;
  featuredVehicleNames?: unknown;
}

interface CreateVideoTaskInput {
  scriptDraftId?: unknown;
}

interface ValidatedAssets {
  vehicleExteriorAssets: AssetRecord[];
  vehicleInteriorAssets: AssetRecord[];
  userReferenceAssets: AssetRecord[];
  dealershipAssets: AssetRecord[];
}

interface VehicleProfile {
  brand: string;
  model: string;
  modelYear: string;
  vehicleClass: string;
  marketPositioning: string;
  targetUsers: string[];
  useCases: string[];
  recognizedHighlights: string[];
  uncertainItems: string[];
}

const VIDEO_DURATION_SECONDS = 15;
const FIXED_SHOT_TIME_RANGES = ["0-3s", "3-7s", "7-12s", "12-15s"] as const;
const VIDEO_DURATION_MS = VIDEO_DURATION_SECONDS * 1000;
const MIN_NARRATION_AUDIO_DURATION_MS = 12_000;
const MAX_NARRATION_AUDIO_DURATION_MS = VIDEO_DURATION_MS;

const workspaceRoot = path.resolve(__dirname, "../../../..");
const digitalHumanRoot = path.join(workspaceRoot, "digital human");
const digitalHumanManifestPath = path.join(digitalHumanRoot, "digital-humans.json");
const referenceManifestPath = path.join(digitalHumanRoot, "reference-materials.json");
const narrationAudioDir = path.join(
  env.resultsDir,
  "video-generation",
  "narration-audio",
);

const asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];

const unique = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const conciseStylePrompt = (value: string) => {
  const sentences =
    value
      .trim()
      .match(/[^。！？!?]+[。！？!?]?/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? [];
  return sentences.slice(0, 2).join("");
};

const normalizeVehicleName = (value: unknown) => {
  if (typeof value !== "string") {
    throw errors.invalidParameter("vehicleName is required");
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 80) {
    throw errors.invalidParameter("vehicleName length must be between 2 and 80 characters", {
      vehicleName: value,
    });
  }
  return normalized;
};

const normalizeVehicleTextField = (
  value: unknown,
  field: string,
  minLength: number,
  maxLength: number,
) => {
  if (typeof value !== "string") {
    throw errors.invalidParameter(`${field} is required`);
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw errors.invalidParameter(
      `${field} length must be between ${minLength} and ${maxLength} characters`,
      { [field]: value },
    );
  }
  return normalized;
};

const normalizeOptionalTextField = (
  value: unknown,
  field: string,
  maxLength: number,
) => {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") {
    throw errors.invalidParameter(`${field} must be a string`);
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length > maxLength) {
    throw errors.invalidParameter(
      `${field} supports at most ${maxLength} characters`,
      { [field]: value },
    );
  }
  return normalized;
};

const normalizeVehicleInput = (body: CreateScriptDraftInput) => {
  if (typeof body.vehicleName === "string" && body.vehicleName.trim()) {
    return {
      vehicleName: normalizeVehicleName(body.vehicleName),
      structuredVehicle: null,
    };
  }

  const brand = normalizeVehicleTextField(body.brand, "brand", 1, 30);
  const modelYear = normalizeVehicleTextField(
    body.modelYear ?? body.nian,
    "modelYear",
    4,
    4,
  );
  if (!/^\d{4}$/.test(modelYear)) {
    throw errors.invalidParameter("modelYear must be a 4-digit year", {
      modelYear,
    });
  }
  const displacement = normalizeVehicleTextField(
    body.displacement ?? body.paiLiang,
    "displacement",
    1,
    20,
  );
  const salesName = normalizeVehicleTextField(
    body.salesName,
    "salesName",
    1,
    50,
  );
  const series = normalizeVehicleTextField(body.series, "series", 1, 50);
  const nameParts = [`${modelYear}款`, brand, series, salesName, displacement];

  return {
    vehicleName: nameParts
      .filter(
        (item, index) =>
          nameParts.findIndex(
            (candidate) =>
              candidate.toLowerCase() === item.toLowerCase(),
          ) === index,
      )
      .join(" "),
    structuredVehicle: {
      brand,
      modelYear,
      displacement,
      salesName,
      series,
    },
  };
};

const normalizeDuration = (value: unknown) => {
  const duration = Number(value ?? VIDEO_DURATION_SECONDS);
  if (duration === VIDEO_DURATION_SECONDS) return VIDEO_DURATION_SECONDS;
  throw errors.invalidParameter("durationSeconds must be 15", { durationSeconds: value });
};

const normalizeSellingPointHints = (value: unknown) => {
  if (value === undefined || value === null) return [] as string[];
  if (!Array.isArray(value)) {
    throw errors.invalidParameter("sellingPointHints must be an array of strings");
  }
  return unique(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  ).slice(0, 8);
};

const readJson = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await fs.readFile(filePath, "utf8")) as T;

const toPublicDigitalHumanAssetUrl = (id: string) =>
  `/api/v1/modules/video-generation/digital-humans/${encodeURIComponent(id)}/image`;

const toPublicReferencePreviewUrl = (id: string) =>
  `/api/v1/modules/video-generation/reference-materials/${encodeURIComponent(id)}/preview`;

const digitalHumanDisplayById: Record<
  string,
  Pick<DigitalHumanRecord, "name" | "ageStyle">
> = {
  "dh-message-01": {
    name: "数字人 1｜亲和女声",
    ageStyle: "年轻女性 · 预设音色 Friendly Paige",
  },
  "dh-message-02": {
    name: "数字人 2｜专业男声",
    ageStyle: "年轻男性 · 预设音色 博学讲师",
  },
  "dh-message-03": {
    name: "数字人 3｜明亮女声",
    ageStyle: "年轻女性 · 预设音色 Bright Queen",
  },
  "dh-message-04": {
    name: "数字人 4｜活力女声",
    ageStyle: "年轻女性 · 预设音色 EngagingGirl",
  },
};

const referenceMaterialDisplayById: Record<
  string,
  {
    title: string;
    referenceRole: string;
    styleTags: string[];
    stylePrompt: string;
    shotPlan15s: NonNullable<ReferenceMaterialRecord["shotPlan15s"]>;
  }
> = {
  "ref-video-001": {
    title: "车场介绍 1｜开场总览",
    referenceRole: "用于介绍门店环境、车场规模和到店看车氛围，适合作为车场介绍开场。",
    styleTags: ["车场介绍", "环境总览", "数字人口播", "真实门店", "开场镜头"],
    stylePrompt: "真实二手车车场介绍风格。数字人以销售顾问身份自然出镜，先建立门店或车场环境，再切入车辆陈列和到店看车氛围。",
    shotPlan15s: [
      {
        timeRange: "0-3s",
        visual: "数字人在门店或车场环境中开场，先建立真实空间和车场氛围。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
      {
        timeRange: "3-7s",
        visual: "镜头扫过车辆排列、通道和门店细节，表现干净可信的库存空间。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
      {
        timeRange: "7-12s",
        visual: "数字人靠近主推车辆，衔接用户上传的车辆外观或车场素材。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
      {
        timeRange: "12-15s",
        visual: "数字人回到主画面收尾，引导用户到店看实车和确认车况。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
    ],
  },
  "ref-video-002": {
    title: "车场介绍 2｜销售导览",
    referenceRole: "以销售顾问口吻带看车场，突出车辆陈列、接待动线和真实服务感。",
    styleTags: ["销售导览", "车场动线", "车辆陈列", "到店体验", "可信讲解"],
    stylePrompt: "销售顾问式车场导览风格。数字人边走边介绍场地、车辆陈列和到店体验，画面明亮自然，语气专业可信。",
    shotPlan15s: [
      {
        timeRange: "0-3s",
        visual: "数字人在门店入口、展厅或车辆队列前开场。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
      {
        timeRange: "3-7s",
        visual: "沿看车动线展示多台车辆和门店空间，形成真实销售现场感。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
      {
        timeRange: "7-12s",
        visual: "切到用户上传的车辆素材，用导览语气说明看车重点。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
      {
        timeRange: "12-15s",
        visual: "数字人在车场背景中停下收尾，提醒以实车配置和车况为准。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
    ],
  },
  "ref-video-003": {
    title: "车场介绍 3｜库存展示",
    referenceRole: "适合展示多台车源和库存规模，再自然引出主推车型或重点车辆。",
    styleTags: ["库存展示", "多车陈列", "真实场地", "主推车源", "稳健节奏"],
    stylePrompt: "多车库存展示风格。数字人在真实车场空间中出镜，镜头强调车辆排列、场地规模和主推车源导入，整体保持真实二手车门店质感。",
    shotPlan15s: [
      {
        timeRange: "0-3s",
        visual: "数字人以多台车辆为背景开场，点明车场或库存主题。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
      {
        timeRange: "3-7s",
        visual: "横向或纵深展示车辆队列，突出库存规模和场地氛围。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
      {
        timeRange: "7-12s",
        visual: "切入用户上传的外观或内饰素材，作为重点车源讲解段落。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
      {
        timeRange: "12-15s",
        visual: "数字人回到车辆旁或车场中做简短收尾。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
    ],
  },
  "ref-video-004": {
    title: "单车品介绍｜实车讲解",
    referenceRole: "聚焦单台车辆，按外观、内饰、空间和使用场景完成短节奏讲解。",
    styleTags: ["单车介绍", "外观展示", "内饰展示", "数字人讲解", "真实卖点"],
    stylePrompt: "单车品介绍风格。数字人与目标车辆共同出镜，在 15 秒内围绕外观、内饰、空间和使用场景组织讲解，所有车况信息以用户上传素材为准。",
    shotPlan15s: [
      {
        timeRange: "0-3s",
        visual: "数字人与目标车辆同框开场，快速说明车型定位。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
      {
        timeRange: "3-7s",
        visual: "展示车辆前脸、侧面和外观细节，严格匹配用户上传外观图。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
      {
        timeRange: "7-12s",
        visual: "在用户提供内饰图时展示座舱、空间或配置细节。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
      {
        timeRange: "12-15s",
        visual: "数字人回到车旁收尾，提醒配置和车况以实车为准。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
    ],
  },
  "ref-video-005": {
    title: "行情资讯｜信息型讲车",
    referenceRole: "适合做车型定位、适用人群和看车关注点说明，不主动编造价格行情。",
    styleTags: ["行情资讯", "信息口播", "车型定位", "理性分析", "二手车内容"],
    stylePrompt: "行情资讯型讲车风格。数字人以理性、信息密度适中的方式介绍车型定位、适用人群和看车关注点；不编造价格走势、保值率或市场变化。",
    shotPlan15s: [
      {
        timeRange: "0-3s",
        visual: "数字人以资讯口吻开场，围绕车型定位和看车关注点建立主题。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
      {
        timeRange: "3-7s",
        visual: "展示用户上传外观素材，说明车型定位和使用场景。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
      {
        timeRange: "7-12s",
        visual: "结合内饰或补充素材说明空间、日常使用和适用人群。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
      {
        timeRange: "12-15s",
        visual: "数字人总结购车前需要确认的配置、车况和实车细节。",
        assetRole: "digital_human|reference_style|vehicle_assets",
      },
    ],
  },
};

const localizeDigitalHumanRecord = (item: DigitalHumanRecord): DigitalHumanRecord => ({
  ...item,
  ...(digitalHumanDisplayById[item.id] ?? {}),
});

const localizeReferenceMaterial = (
  material: ReferenceMaterialRecord,
): ReferenceMaterialRecord => {
  const display = referenceMaterialDisplayById[material.id];
  if (!display) return material;
  return {
    ...material,
    title: display.title,
    referenceRole: display.referenceRole,
    stylePrompt: display.stylePrompt,
    scenePrompt: display.stylePrompt,
    shotPlan15s: display.shotPlan15s,
    styleJson: {
      ...material.styleJson,
      referenceRole: display.referenceRole,
      styleTags: display.styleTags,
      sceneStyle: display.stylePrompt,
    },
  };
};

const summarizeAsset = (asset: AssetRecord) => ({
  assetId: asset.id,
  purpose: asset.purpose,
  url: asset.publicUrl,
  thumbnailUrl: asset.thumbnailUrl,
  fileName: asset.fileName,
  width: asset.width,
  height: asset.height,
});

const toPresetDigitalHumanVoice = (digitalHuman: DigitalHumanRecord) => {
  const preset = digitalHuman.presetVoice;
  if (!preset || preset.status !== "ready" || !preset.voiceId) return null;
  return {
    digitalHumanId: digitalHuman.id,
    status: "ready" as const,
    voiceId: preset.voiceId,
    model: preset.model ?? env.minimax.speechModel,
    sourceFileName: preset.displayName ?? null,
    updatedAt: null as Date | null,
    speed: preset.speed,
    source: "manifest_preset" as const,
  };
};

const toSceneShotPlanPrompt = (material: ReferenceMaterialRecord) => {
  const shotPlan = material.shotPlan15s ?? [];
  if (!shotPlan.length) return "";
  return [
    "预设场景 15 秒分镜：",
    ...shotPlan.map(
      (shot) =>
        `${shot.timeRange}：${shot.visual}${shot.assetRole ? `（素材角色：${shot.assetRole}）` : ""}`,
    ),
  ].join("\n");
};

const assertAssetPurpose = (asset: AssetRecord, allowed: AssetPurpose[], role: string) => {
  if (!allowed.includes(asset.purpose)) {
    throw errors.invalidParameter(`${role} asset purpose is not allowed`, {
      assetId: asset.id,
      purpose: asset.purpose,
      allowed,
    });
  }
};

const buildScriptPrompt = (input: {
  vehicleName: string;
  durationSeconds: number;
  referenceMaterial: ReferenceMaterialRecord;
  sellingPointHints: string[];
  vehicleImageSummary?: string;
  language: VideoGenerationLanguage;
  templateType: VideoTemplateType;
  promotionText?: string;
  dealershipName?: string;
  featuredVehicleNames?: string;
}) => {
  const style = input.referenceMaterial.styleJson;
  return [
    "你是汽车行业短视频口播文案策划。请只输出 JSON。",
    `模板类型：${videoTemplateTypeLabels[input.templateType]}`,
    `内容主体：${input.vehicleName}`,
    `目标语言：${getVideoGenerationLanguageLabel(input.language)}`,
    `视频时长：${input.durationSeconds} 秒`,
    input.promotionText ? `优惠信息：${input.promotionText}` : "",
    input.dealershipName ? `车场名称：${input.dealershipName}` : "",
    input.featuredVehicleNames
      ? `主推车型：${input.featuredVehicleNames}`
      : "",
    `用户补充卖点：${input.sellingPointHints.length ? input.sellingPointHints.join("、") : "无"}`,
    `车辆图片摘要：${input.vehicleImageSummary || "暂无，不能假设车色、车况、年份、里程和价格。"}`,
    `参考视频标题：${input.referenceMaterial.title}`,
    `视频类型：${input.referenceMaterial.videoType}`,
    `风格标签：${style.styleTags.join("、")}`,
    `场景风格：${style.sceneStyle}`,
    `灯光：${style.lighting}`,
    `镜头语言：${style.cameraLanguage}`,
    `节奏：${style.pacing}`,
    `禁用方向：${style.avoid.join("、")}`,
    `预设风格与场景 Prompt：${conciseStylePrompt(input.referenceMaterial.stylePrompt)}`,
    toSceneShotPlanPrompt(input.referenceMaterial),
    "要求：文案必须适合数字人口播；视频风格、类型、镜头节奏必须跟随参考素材；不得编造年份、里程、事故、价格、金融政策。",
  ].filter(Boolean).join("\n");
};

const buildDeepSeekSystemPrompt = (input: {
  language: VideoGenerationLanguage;
  templateType: VideoTemplateType;
}) =>
  [
    "你是汽车行业短视频口播文案策划，负责根据用户输入、上传图片摘要和预设参考风格生成数字人口播文案。",
    "只输出 JSON，不输出 Markdown，不输出解释。",
    `目标语言为${getVideoGenerationLanguageLabel(input.language)}，scriptText、openingHook、sellingPoints、shotCues.voiceover 必须使用该语言。`,
    `视频时长以上限 15 秒为准，口播音频必须自然控制在 12-15 秒之间，绝不能超过 15 秒。${getVideoGenerationScriptLengthRule(input.language)}`,
    "如果信息量和时长冲突，必须优先压缩文案，宁可少讲一个卖点，也不能让自然语速口播超过 15 秒。",
    `当前模板类型为${videoTemplateTypeLabels[input.templateType]}，必须围绕该模板目标组织内容。`,
    "不能只复述用户输入的车名。先识别品牌、车型、年款、车型级别、市场定位、目标人群和使用场景，再提炼适合 12-15 秒口播的车型级通用卖点。",
    "可以使用可靠的车型级常识介绍车辆定位、空间取向、舒适取向和典型使用场景；凡是依赖具体配置版本的信息，必须放入 uncertainItems，不能写成确定事实。",
    "年款不代表新车。二手车口播禁止使用“全新”“新车”；车型名称未明确提供代际时，禁止擅自补充“第几代”。",
    "禁止使用“公认、标杆、首选、领先、就是答案、闭眼买”等绝对化营销词；未由图片摘要确认时，不要断言座椅软硬、内饰用料或具体车内配置。",
    "视频类型、场景氛围、镜头节奏、灯光和表达方式必须跟随用户选择的参考素材。",
    "不得编造年份以外的新信息，不得编造公里数、价格、事故记录、过户次数、金融政策、官方配置和车况承诺。",
    "除非用户明确提供，否则禁止出现：几万块、价格实惠、车况精品、准新车、无事故、原版原漆、包过户、金融优惠、老铁、抓紧。",
    "口播可以有销售感，但必须保持专业克制，不使用夸张直播叫卖口吻。",
    "如果用户上传图片摘要提供了外观、内饰、颜色、座舱或细节信息，可以用于文案；没有提供的信息不要假设。",
    "输出 JSON 字段：vehicleProfile, openingHook, scriptText, sellingPoints, shotCues, riskNotes。",
    "vehicleProfile 必须包含 brand, model, modelYear, vehicleClass, marketPositioning, targetUsers, useCases, recognizedHighlights, uncertainItems。",
    "shotCues 必须正好 4 段，时间依次为 0-3s、3-7s、7-12s、12-15s，依次承担车型定位开场、外观卖点、内饰空间及使用场景、数字人收束。",
    "shotCues 每项包含 timeRange, visual, voiceover, assetRole；assetRole 可包含 digital_human、reference_style、exterior、interior、user_reference。",
  ].join("\n");

const buildDeepSeekUserPrompt = (input: {
  vehicleName: string;
  durationSeconds: number;
  referenceMaterial: ReferenceMaterialRecord;
  sellingPointHints: string[];
  vehicleImageSummary?: string;
  assetSummary: string;
  language: VideoGenerationLanguage;
  templateType: VideoTemplateType;
  promotionText?: string;
  dealershipName?: string;
  featuredVehicleNames?: string;
}) => {
  const style = input.referenceMaterial.styleJson;
  return [
    `模板类型：${videoTemplateTypeLabels[input.templateType]}`,
    `内容主体：${input.vehicleName}`,
    `目标语言：${getVideoGenerationLanguageLabel(input.language)}`,
    `视频时长：上限 ${input.durationSeconds} 秒。口播音频必须自然控制在 12-15 秒之间，只能短于或等于 15 秒，绝不能超过 15 秒。${getVideoGenerationScriptLengthRule(input.language)}`,
    "如果卖点较多，优先保留车型定位、核心用途和一条最可信卖点，删掉次要描述，避免口播超时。",
    input.promotionText ? `用户确认的优惠信息：${input.promotionText}` : "",
    input.dealershipName ? `车场名称：${input.dealershipName}` : "",
    input.featuredVehicleNames
      ? `主推车型：${input.featuredVehicleNames}`
      : "",
    `用户补充卖点：${input.sellingPointHints.length ? input.sellingPointHints.join("、") : "无"}`,
    `车辆图片摘要：${input.vehicleImageSummary || "暂无"}`,
    `上传素材摘要：${input.assetSummary}`,
    "",
    "参考素材风格如下，最终文案和镜头必须跟随它：",
    `参考素材标题：${input.referenceMaterial.title}`,
    `视频类型：${input.referenceMaterial.videoType}`,
    `风格标签：${style.styleTags.join("、")}`,
    `场景风格：${style.sceneStyle}`,
    `视觉质感：${style.visualTone}`,
    `灯光：${style.lighting}`,
    `镜头语言：${style.cameraLanguage}`,
    `构图：${style.subjectComposition}`,
    `节奏：${style.pacing}`,
    `禁用方向：${style.avoid.join("、")}`,
    `预设风格与场景 Prompt：${conciseStylePrompt(input.referenceMaterial.stylePrompt)}`,
    toSceneShotPlanPrompt(input.referenceMaterial),
    "",
    "生成要求：",
    "1. 先在 vehicleProfile 中给出车型级理解，不能只复述车名。",
    "2. scriptText 必须自然包含车型定位、目标人群或使用场景，并讲出 1-2 个稳妥的车型卖点；时长优先，不能为了卖点完整而超时。",
    "3. 未提供具体配置版本时，不得写死动力形式、排量、辅助驾驶、屏幕尺寸、座椅功能等配置。",
    "4. 用户上传图片是车辆外观和内饰的事实依据；参考视频只决定风格、类型、场景和镜头节奏。",
    "5. 这是二手车视频：禁止使用“全新”“新车”；输入未写明代际时，禁止补充第几代车型。",
    "6. 避免“公认标杆、同级领先、就是答案、省心耐用、座椅柔软、用料考究”等无法仅凭车名确认的主观结论，优先讲车型定位、空间取向、舒适取向和使用场景。",
  ].filter(Boolean).join("\n");
};

const inferVehicleCategory = (vehicleName: string) => {
  if (/猛禽|F-?150|皮卡|坦途|炮/.test(vehicleName)) return "hardcore_pickup";
  if (/MPV|GL8|奥德赛|赛那|腾势D9|梦想家|宝马\s*218i|2系旅行/.test(vehicleName)) return "mpv";
  if (/SUV|CR-?V|RAV4|汉兰达|理想|问界|唐|宋/.test(vehicleName)) return "suv";
  if (/汉|凯美瑞|雅阁|帕萨特|迈腾|A4|3系|5系|C级|E级/.test(vehicleName)) return "sedan";
  return "general";
};

const sellingPointFallbacks = (vehicleName: string) => {
  const category = inferVehicleCategory(vehicleName);
  if (category === "hardcore_pickup") return ["气场强", "装载能力", "回头率", "户外场景适配"];
  if (category === "mpv") return ["空间舒适", "多人出行", "座舱实用", "商务家用兼顾"];
  if (category === "suv") return ["空间实用", "通过性更从容", "家庭出行", "视野开阔"];
  if (category === "sedan") return ["家用舒适", "通勤省心", "外观耐看", "驾驶质感"];
  return ["外观状态", "空间表现", "日常通勤", "到店实看"];
};

const localScriptFallbackLanguages = new Set<VideoGenerationLanguage>([
  "Chinese",
  "Chinese,Yue",
  "English",
]);

const canUseLocalScriptFallback = (language: VideoGenerationLanguage) =>
  localScriptFallbackLanguages.has(language);

const compactNarrationScript = (
  scriptText: string,
  language: VideoGenerationLanguage,
) => {
  const trimmed = scriptText.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  const cjkLike = ["Chinese", "Chinese,Yue", "Japanese", "Korean"].includes(language);
  if (cjkLike) {
    return trimmed.length > 82 ? `${trimmed.slice(0, 82).replace(/[，,。.!！?？、；;：:]$/, "")}。` : trimmed;
  }
  const maxWords = [
    "Russian",
    "German",
    "French",
    "Spanish",
    "Portuguese",
    "Italian",
    "Ukrainian",
    "Polish",
    "Romanian",
    "Greek",
    "Czech",
    "Bulgarian",
    "Hungarian",
    "Norwegian",
    "Slovenian",
    "Catalan",
    "Nynorsk",
    "Afrikaans",
  ].includes(language)
    ? 24
    : 32;
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordLimited =
    words.length <= maxWords ? trimmed : words.slice(0, maxWords).join(" ");
  const charLimited =
    !cjkLike && wordLimited.length > 155
      ? wordLimited.slice(0, 155).replace(/\s+\S*$/, "")
      : wordLimited;
  if (charLimited === trimmed) return trimmed;
  const shortened = charLimited.replace(/[，,。.!！?？、；;：:]$/, "");
  return `${shortened}.`;
};

const isCjkLikeNarrationLanguage = (language: VideoGenerationLanguage) =>
  ["Chinese", "Chinese,Yue", "Japanese", "Korean"].includes(language);

const trimNarrationPunctuation = (value: string) =>
  value.trim().replace(/[\s,.;:!?，。！？、；：]+$/, "");

const shortenNarrationScriptForDuration = (input: {
  scriptText: string;
  language: VideoGenerationLanguage;
  currentDurationMs: number;
  attempt: number;
}) => {
  const normalized = input.scriptText.trim().replace(/\s+/g, " ");
  if (!normalized) return normalized;

  const targetRatio = Math.max(
    0.42,
    Math.min(0.94, (MAX_NARRATION_AUDIO_DURATION_MS * 0.96) / input.currentDurationMs),
  );
  const safetyRatio = Math.max(0.38, targetRatio - Math.max(0, input.attempt - 1) * 0.08);

  if (isCjkLikeNarrationLanguage(input.language)) {
    const targetLength = Math.max(42, Math.floor(normalized.length * safetyRatio));
    const shortened = trimNarrationPunctuation(normalized.slice(0, targetLength));
    return shortened ? `${shortened}。` : normalized;
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const targetWords = Math.max(14, Math.floor(words.length * safetyRatio));
  const wordLimited = words.slice(0, targetWords).join(" ");
  const charLimit = Math.max(96, Math.floor(normalized.length * safetyRatio));
  const charLimited =
    wordLimited.length > charLimit
      ? wordLimited.slice(0, charLimit).replace(/\s+\S*$/, "")
      : wordLimited;
  const shortened = trimNarrationPunctuation(charLimited);
  return shortened ? `${shortened}.` : normalized;
};

const narrationExtensionByLanguage: Partial<Record<VideoGenerationLanguage, string>> = {
  Chinese: "整体来看，这台车更适合日常通勤和家庭出行，具体配置和车况欢迎到店结合实车进一步了解。",
  "Chinese,Yue": "整体嚟讲，呢台车好适合日常代步同家庭出行，具体配置同车况欢迎到店睇实车再了解。",
  English:
    "Overall, it is a practical choice for daily commuting and family use. Visit the showroom to check the vehicle details in person.",
  Russian:
    "В целом, этот автомобиль хорошо подходит для ежедневных поездок и семейного использования. Подробности лучше уточнить при осмотре автомобиля.",
  German:
    "Insgesamt eignet sich dieses Fahrzeug gut fuer Alltag und Familie. Weitere Details pruefen wir gern direkt am Fahrzeug vor Ort.",
  Japanese:
    "全体として、日常の移動や家族での利用に向いた一台です。詳しい状態は実車で確認できます。",
  Korean:
    "전반적으로 일상 주행과 가족용으로 잘 어울리는 차량입니다. 자세한 상태는 실차로 확인해 보실 수 있습니다.",
  French:
    "Dans l'ensemble, ce vehicule convient bien aux trajets quotidiens et aux usages familiaux. Les details sont a verifier sur place.",
  Spanish:
    "En conjunto, es una opcion practica para uso diario y familiar. Los detalles se pueden confirmar revisando el vehiculo en persona.",
};

const extendNarrationScriptForDuration = (input: {
  scriptText: string;
  language: VideoGenerationLanguage;
}) => {
  const normalized = trimNarrationPunctuation(input.scriptText.replace(/\s+/g, " "));
  const extension =
    narrationExtensionByLanguage[input.language] ??
    "Please review the vehicle in person for more details about its condition, configuration, and actual availability.";
  if (!normalized) return extension;
  if (normalized.includes(trimNarrationPunctuation(extension).slice(0, 16))) {
    return `${normalized} ${extension}`;
  }
  return isCjkLikeNarrationLanguage(input.language)
    ? `${normalized}。${extension}`
    : `${normalized}. ${extension}`;
};

const getGenerationErrorDetails = (error: unknown): Record<string, unknown> => {
  if (!error || typeof error !== "object") return {};
  const details = (error as { details?: unknown }).details;
  return details && typeof details === "object"
    ? (details as Record<string, unknown>)
    : {};
};

const isNarrationAudioTooLongError = (error: unknown) =>
  error instanceof Error &&
  error.message.includes("MiniMax narration audio exceeds the 15-second maximum");

const isNarrationAudioTooShortError = (error: unknown) =>
  error instanceof Error &&
  error.message.includes("MiniMax narration audio is shorter than the 12-second minimum");

const inferVehicleProfile = (vehicleName: string): VehicleProfile => {
  const modelYear = vehicleName.match(/(\d{2,4})款/)?.[1];
  if (/凯美瑞/i.test(vehicleName)) {
    return {
      brand: "丰田",
      model: "凯美瑞",
      modelYear: modelYear ? `${modelYear}款` : "",
      vehicleClass: "中型轿车",
      marketPositioning: "兼顾日常通勤和家庭出行的主流中型轿车",
      targetUsers: ["日常通勤用户", "家庭用车用户", "重视舒适与实用性的轿车用户"],
      useCases: ["城市通勤", "家庭出行", "中长途驾驶"],
      recognizedHighlights: ["外观设计年轻利落", "车内空间实用", "乘坐舒适性", "日常使用友好"],
      uncertainItems: ["具体动力版本", "具体配置", "车辆价格", "里程和车况"],
    };
  }

  const category = inferVehicleCategory(vehicleName);
  const categoryProfiles: Record<string, Pick<VehicleProfile, "vehicleClass" | "marketPositioning" | "targetUsers" | "useCases">> = {
    hardcore_pickup: {
      vehicleClass: "皮卡",
      marketPositioning: "兼顾户外场景、装载能力和个性表达的车型",
      targetUsers: ["户外活动用户", "重视装载能力的用户"],
      useCases: ["户外出行", "多用途装载", "日常个性化驾驶"],
    },
    mpv: {
      vehicleClass: "MPV",
      marketPositioning: "强调多人乘坐、空间和舒适性的车型",
      targetUsers: ["多成员家庭", "商务接待用户"],
      useCases: ["家庭多人出行", "商务接待", "中长途乘坐"],
    },
    suv: {
      vehicleClass: "SUV",
      marketPositioning: "兼顾空间、视野和多场景出行的车型",
      targetUsers: ["家庭用户", "重视空间和视野的用户"],
      useCases: ["城市通勤", "家庭出行", "周末近郊出行"],
    },
    sedan: {
      vehicleClass: "轿车",
      marketPositioning: "兼顾通勤、舒适性和家庭使用的车型",
      targetUsers: ["日常通勤用户", "家庭用车用户"],
      useCases: ["城市通勤", "家庭出行", "中长途驾驶"],
    },
    general: {
      vehicleClass: "乘用车",
      marketPositioning: "满足日常通勤和出行需求的车型",
      targetUsers: ["日常用车用户"],
      useCases: ["日常通勤", "家庭出行"],
    },
  };
  const profile = categoryProfiles[category] || categoryProfiles.general;
  return {
    brand: "",
    model: vehicleName,
    modelYear: modelYear ? `${modelYear}款` : "",
    ...profile,
    recognizedHighlights: sellingPointFallbacks(vehicleName),
    uncertainItems: ["具体动力版本", "具体配置", "车辆价格", "里程和车况"],
  };
};

const buildFallbackProfile = (input: {
  subjectName: string;
  templateType: VideoTemplateType;
  featuredVehicleNames?: string;
}) => {
  if (input.templateType !== "dealership") {
    return inferVehicleProfile(input.subjectName);
  }
  return {
    brand: "",
    model: input.subjectName,
    modelYear: "",
    vehicleClass: "二手车展厅",
    marketPositioning: "通过真实场地与车辆陈列介绍车场和到店体验",
    targetUsers: ["本地二手车消费者", "希望到店看车的用户"],
    useCases: ["车场介绍", "展厅导览", "主推车型展示"],
    recognizedHighlights: [
      "真实场地展示",
      "车辆陈列介绍",
      ...(input.featuredVehicleNames ? ["主推车型展示"] : []),
    ],
    uncertainItems: ["实时库存", "车辆价格", "具体配置", "车况和服务承诺"],
  } satisfies VehicleProfile;
};

const buildScriptText = (input: {
  vehicleName: string;
  referenceMaterial: ReferenceMaterialRecord;
  sellingPointHints: string[];
  vehicleImageSummary?: string;
  language: VideoGenerationLanguage;
  templateType: VideoTemplateType;
  promotionText?: string;
  dealershipName?: string;
  featuredVehicleNames?: string;
}) => {
  const profile = inferVehicleProfile(input.vehicleName);
  const points = input.sellingPointHints.length ? input.sellingPointHints : profile.recognizedHighlights;
  if (input.templateType === "dealership") {
    const dealershipName = input.dealershipName || input.vehicleName;
    const featured = input.featuredVehicleNames
      ? `，主推${input.featuredVehicleNames}`
      : "";
    if (input.language === "English") {
      return `Welcome to ${dealershipName}. Explore a clear, comfortable showroom with carefully presented used cars${input.featuredVehicleNames ? `, including ${input.featuredVehicleNames}` : ""}. Our digital host will guide you through the space and featured vehicles. Visit the store to confirm availability and vehicle details.`;
    }
    if (input.language === "Chinese,Yue") {
      return `欢迎嚟到${dealershipName}，展厅环境企理，二手车展示清晰${featured}。数字人会带你睇场地、车辆陈列同重点车型，实际库存、配置同车况，请到店再确认。`;
    }
    return `欢迎来到${dealershipName}，展厅环境整洁明亮，二手车陈列清晰${featured}。数字人将带你快速了解场地、车辆展示和主推车型；实际库存、具体配置和车况，请以到店确认结果为准。`;
  }
  if (input.templateType === "promotion") {
    const promotionText = input.promotionText || "";
    if (input.language === "English") {
      return `${input.vehicleName} is ready for a closer look. It balances practical space, daily comfort and confident styling for commuting and family use. Current offer: ${promotionText}. Final eligibility, vehicle condition and configuration must be confirmed with the store.`;
    }
    if (input.language === "Chinese,Yue") {
      return `${input.vehicleName}，空间实用、日常乘坐舒服，外观亦够利落，适合通勤同家庭出行。今期优惠系：${promotionText}。实际车况、配置同优惠适用条件，请到店确认。`;
    }
    return `${input.vehicleName}，兼顾实用空间、日常舒适和利落外观，适合通勤与家庭出行。本期优惠信息：${promotionText}。实际车况、具体配置和优惠适用条件，请以到店确认结果为准。`;
  }
  if (input.language === "English") {
    return `${input.vehicleName} is designed for practical daily use, balancing comfort, useful space and confident styling. It suits commuting, family trips and city driving. Please confirm the exact configuration, mileage and vehicle condition from the uploaded materials and inspection report.`;
  }
  if (input.language === "Chinese,Yue") {
    return `${input.vehicleName}，定位实用，兼顾舒适、空间同日常驾驶，适合城市通勤同家庭出行。外观同内饰细节以用户上传图片为准，具体配置、里程同车况，请结合实车同检测报告确认。`;
  }
  if (/宝马\s*218i|2系旅行/i.test(input.vehicleName)) {
    return `${input.vehicleName}，是一台兼顾驾驶感和实用空间的紧凑型多功能旅行车。深蓝车身配合宝马经典双肾格栅，外观精致利落；座舱布局清晰，前排空间实用，较短车身在城市道路和停车场更灵活，适合日常通勤与家庭出行。具体配置和车况，请以实车图片与检测为准。`;
  }
  return `${input.vehicleName}，是一台${profile.marketPositioning}。${points.slice(0, 3).join("、")}，兼顾日常通勤、家庭出行和城市道路中的灵活使用，适合重视舒适与实用性的用户。具体配置和车况，请以实车图片与检测为准。`;
};

const hasUnsupportedScriptClaims = (scriptText: string, vehicleName: string) => {
  if (/全新|新车/.test(scriptText)) return true;
  if (/公认|标杆|首选|领先|就是答案|闭眼买|座椅柔软|省心耐用|用料考究/.test(scriptText)) return true;
  if (!/第[一二三四五六七八九十0-9]+代/.test(vehicleName) && /第[一二三四五六七八九十0-9]+代/.test(scriptText)) {
    return true;
  }
  return false;
};

const mergeGeneratedDraft = (fallback: {
  vehicleName: string;
  vehicleProfile: VehicleProfile;
  scriptText: string;
  openingHook: string;
  sellingPoints: string[];
  shotCues: ReturnType<typeof buildShotCues>;
  riskNotes: string[];
}, generated: Awaited<ReturnType<typeof deepSeekClient.createScriptDraft>>) => {
  if (!generated) return { ...fallback, usedGeneratedScript: false };
  const usedGeneratedScript =
    Boolean(generated.scriptText) &&
    !hasUnsupportedScriptClaims(generated.scriptText, fallback.vehicleName);
  const generatedShotCues = usedGeneratedScript && generated.shotCues.length >= FIXED_SHOT_TIME_RANGES.length
    ? generated.shotCues.slice(0, FIXED_SHOT_TIME_RANGES.length).map((cue, index) => ({
        ...cue,
        timeRange: FIXED_SHOT_TIME_RANGES[index],
        assetRole: cue.assetRole || fallback.shotCues[index].assetRole,
      }))
    : fallback.shotCues;
  return {
    vehicleProfile: {
      brand: generated.vehicleProfile.brand || fallback.vehicleProfile.brand,
      model: generated.vehicleProfile.model || fallback.vehicleProfile.model,
      modelYear: generated.vehicleProfile.modelYear || fallback.vehicleProfile.modelYear,
      vehicleClass: generated.vehicleProfile.vehicleClass || fallback.vehicleProfile.vehicleClass,
      marketPositioning: generated.vehicleProfile.marketPositioning || fallback.vehicleProfile.marketPositioning,
      targetUsers: generated.vehicleProfile.targetUsers.length ? generated.vehicleProfile.targetUsers : fallback.vehicleProfile.targetUsers,
      useCases: generated.vehicleProfile.useCases.length ? generated.vehicleProfile.useCases : fallback.vehicleProfile.useCases,
      recognizedHighlights: generated.vehicleProfile.recognizedHighlights.length
        ? generated.vehicleProfile.recognizedHighlights
        : fallback.vehicleProfile.recognizedHighlights,
      uncertainItems: generated.vehicleProfile.uncertainItems.length
        ? generated.vehicleProfile.uncertainItems
        : fallback.vehicleProfile.uncertainItems,
    },
    scriptText: usedGeneratedScript ? generated.scriptText : fallback.scriptText,
    openingHook: usedGeneratedScript ? generated.openingHook || fallback.openingHook : fallback.openingHook,
    sellingPoints: generated.sellingPoints.length ? generated.sellingPoints : fallback.sellingPoints,
    shotCues: generatedShotCues,
    riskNotes: [
      ...(generated.riskNotes.length ? generated.riskNotes : fallback.riskNotes),
      ...(generated.scriptText && !usedGeneratedScript
        ? ["模型文案包含未由输入支持的信息或绝对化营销表述，后端已改用安全兜底口播。"]
        : []),
    ],
    usedGeneratedScript,
  };
};

const buildShotCues = (input: {
  vehicleName: string;
  referenceMaterial: ReferenceMaterialRecord;
  scriptText: string;
  templateType?: VideoTemplateType;
}) => {
  if (input.templateType === "dealership") {
    return [
      {
        timeRange: FIXED_SHOT_TIME_RANGES[0],
        visual: `数字人在${input.referenceMaterial.title}对应的预设场景中出场，建立车场或展厅全景。`,
        voiceover: `点明${input.vehicleName}名称和车场定位。`,
        assetRole: "digital_human|reference_style|dealership",
      },
      {
        timeRange: FIXED_SHOT_TIME_RANGES[1],
        visual: "展示用户上传的车场入口、展厅空间和车辆陈列。",
        voiceover: "介绍场地环境、展示方式和到店体验。",
        assetRole: "dealership|reference_style",
      },
      {
        timeRange: FIXED_SHOT_TIME_RANGES[2],
        visual: "切换主推车型或车辆陈列细节，保持空间和数字人身份一致。",
        voiceover: "介绍主推车型或服务范围，不编造库存、价格和承诺。",
        assetRole: "dealership|user_reference|reference_style",
      },
      {
        timeRange: FIXED_SHOT_TIME_RANGES[3],
        visual: "数字人在展厅内收束，背景保留真实车场参考。",
        voiceover: "引导到店确认库存、配置和车况。",
        assetRole: "digital_human|dealership|reference_style",
      },
    ];
  }
  if (input.templateType === "promotion") {
    return [
      {
        timeRange: FIXED_SHOT_TIME_RANGES[0],
        visual: `数字人与车辆同框，采用${input.referenceMaterial.title}的活泼促销节奏。`,
        voiceover: `快速点明${input.vehicleName}和本期活动。`,
        assetRole: "digital_human|reference_style|exterior",
      },
      {
        timeRange: FIXED_SHOT_TIME_RANGES[1],
        visual: "展示车辆外观参考图和可确认的真实细节。",
        voiceover: "简述车型定位和外观卖点。",
        assetRole: "exterior|reference_style",
      },
      {
        timeRange: FIXED_SHOT_TIME_RANGES[2],
        visual: "展示内饰、空间或补充参考图，画面突出活动信息但不生成错误文字。",
        voiceover: "准确播报用户填写的优惠信息及适用条件提醒。",
        assetRole: "interior|exterior|user_reference|reference_style",
      },
      {
        timeRange: FIXED_SHOT_TIME_RANGES[3],
        visual: "数字人回到车旁收束，保持轻快节奏。",
        voiceover: "引导到店确认车况、配置和优惠资格。",
        assetRole: "digital_human|reference_style",
      },
    ];
  }
  return [
    {
      timeRange: FIXED_SHOT_TIME_RANGES[0],
      visual: `数字人出场，画面采用${input.referenceMaterial.title}的场景和镜头节奏，车辆外观参考图入画。`,
      voiceover: `快速点明${input.vehicleName}的车型级别和市场定位。`,
      assetRole: "digital_human|reference_style|exterior",
    },
    {
      timeRange: FIXED_SHOT_TIME_RANGES[1],
      visual: "展示车辆外观参考图对应的前45度、侧身、灯组、轮毂或车身线条。",
      voiceover: "突出车型外观取向和用户上传图片能够确认的真实细节。",
      assetRole: "exterior|reference_style",
    },
    {
      timeRange: FIXED_SHOT_TIME_RANGES[2],
      visual: "如用户上传内饰图，切入方向盘、中控、座椅和空间；否则继续展示外观细节。",
      voiceover: "讲解车型空间、舒适取向、目标人群和使用场景，避免编造具体配置。",
      assetRole: "interior|exterior|reference_style",
    },
    {
      timeRange: FIXED_SHOT_TIME_RANGES[3],
      visual: "数字人回到车旁收束，保持参考素材的视频类型和节奏。",
      voiceover: "数字人简洁收束，引导用户进一步确认具体配置和车况。",
      assetRole: "digital_human|reference_style",
    },
  ];
};

const asRecord = (value: unknown): Record<string, any> =>
  value && typeof value === "object" ? (value as Record<string, any>) : {};

const draftAssetIds = (draft: Awaited<ReturnType<typeof videoScriptDraftRepository.findById>>) => {
  const requiredInputs = asRecord(draft?.requiredInputs);
  const uploadedReferences = asRecord(requiredInputs.uploadedReferences);
  const ids = (value: unknown) =>
    Array.isArray(value)
      ? value
          .map((item) => asRecord(item).assetId)
          .filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];

  return {
    exteriorIds: ids(uploadedReferences.vehicleExteriorAssets),
    interiorIds: ids(uploadedReferences.vehicleInteriorAssets),
    userReferenceIds: ids(uploadedReferences.userReferenceAssets),
    dealershipIds: ids(uploadedReferences.dealershipAssets),
  };
};

const buildVideoTaskErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : "video generation task creation failed";
  const details =
    error && typeof error === "object" && "details" in error
      ? (error as { details?: unknown }).details
      : undefined;
  return details === undefined
    ? message
    : `${message}\nKIE response: ${JSON.stringify(details).slice(0, 4000)}`;
};

const deriveSeedanceDurationSeconds = (audioDurationMs: number | null) => {
  if (!audioDurationMs) return VIDEO_DURATION_SECONDS;
  return Math.min(
    VIDEO_DURATION_SECONDS,
    Math.max(5, Math.ceil(audioDurationMs / 1000)),
  );
};

const isChineseNarrationLanguage = (language: VideoGenerationLanguage) =>
  language === "Chinese" || language === "Chinese,Yue";

const FIXED_DEALERSHIP_SEEDANCE_PROMPT =
  "用模特 {{Mixed 2}} ，生成精品二手车销售风格的口播短视频使用音频 {{Mixed 3}} ，真人口播感，场地参考图 {{Mixed 1}} ，不要做特写，不要画面文字，不要打开引擎盖，不要展示我没给你参考图部位，内容真实。";

const toMixedReferenceList = (start: number, count: number) =>
  count > 0
    ? Array.from({ length: count }, (_, index) => `{{Mixed ${start + index}}}`).join(" ")
    : "无";

const conciseSingleCarSceneRequirement = (finalVideoPrompt: string) => {
  const paragraphs = finalVideoPrompt
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  return paragraphs.slice(0, 2).join("\n\n");
};

const buildFixedSingleCarSeedancePrompt = (input: {
  language: VideoGenerationLanguage;
  exteriorCount: number;
  interiorCount: number;
  finalVideoPrompt: string;
  scriptText: string;
  durationSeconds?: number;
  audioDurationMs?: number | null;
}) => {
  const languageLabel = getVideoGenerationLanguageLabel(input.language);
  const exteriorReferences = toMixedReferenceList(3, input.exteriorCount);
  const interiorReferences = toMixedReferenceList(3 + input.exteriorCount, input.interiorCount);
  const base =
    `用 模特 {{Mixed 1}} ，生成精品二手车销售风格的口播短视频，真人口播感，车辆外观参考图 ${exteriorReferences} ，车辆内饰参考图 ${interiorReferences} ，不要做特写，不要画面文字，不要打开引擎盖，不要展示我没给你参考图部位，内容真实。 她完全按照提供的${languageLabel}音频 {{Mixed 2}} 进行跟读。`;
  const sceneRequirement = `场景与分镜要求：${conciseSingleCarSceneRequirement(input.finalVideoPrompt)}`;

  if (isChineseNarrationLanguage(input.language)) {
    return [base, "无字幕。自然对嘴，专业解说视频风格。", sceneRequirement].join("\n");
  }

  return [
    base,
    "不要翻译这段演讲。",
    "不要说中文或普通话。",
    "无字幕。",
    "自然对嘴，专业解说视频风格。",
    sceneRequirement,
  ].join("\n");
};

export const buildSeedancePrompt = (input: {
  finalVideoPrompt: string;
  scriptText: string;
  exteriorCount: number;
  interiorCount: number;
  userReferenceCount: number;
  dealershipCount: number;
  language: VideoGenerationLanguage;
  templateType: VideoTemplateType;
  durationSeconds?: number;
  audioDurationMs?: number | null;
}) => {
  if (input.templateType === "dealership") {
    return FIXED_DEALERSHIP_SEEDANCE_PROMPT;
  }

  if (input.templateType === "single-car") {
    return buildFixedSingleCarSeedancePrompt(input);
  }

  const durationSeconds = input.durationSeconds ?? VIDEO_DURATION_SECONDS;
  const firstExteriorImage = 2;
  const exteriorEnd = firstExteriorImage + input.exteriorCount - 1;
  const firstInteriorImage = exteriorEnd + 1;
  const interiorEnd = firstInteriorImage + input.interiorCount - 1;
  const firstDealershipImage = interiorEnd + 1;
  const dealershipEnd =
    firstDealershipImage + input.dealershipCount - 1;
  const firstUserReferenceImage = dealershipEnd + 1;
  const userReferenceEnd = firstUserReferenceImage + input.userReferenceCount - 1;
  const range = (start: number, end: number) =>
    start > end
      ? "无"
      : Array.from({ length: end - start + 1 }, (_, index) => `#image${start + index}`).join("、");

  return [
    `生成一条严格 ${durationSeconds} 秒、9:16 竖屏、720p 的${getVideoGenerationLanguageLabel(input.language)}汽车行业数字人口播视频。`,
    `模板类型：${videoTemplateTypeLabels[input.templateType]}。`,
    "媒体引用规则：",
    "- #image1 是同一个数字人的四视图和人物特写身份板。只提取身份、五官、发型、服装和体型，最终画面只能出现一个完整自然的人物，禁止把多视图拼板直接放进视频。",
    `- 车辆外观事实依据：${range(firstExteriorImage, exteriorEnd)}。保持同一辆车的车身颜色、结构、灯组、轮毂和外观细节一致。`,
    `- 车辆内饰事实依据：${range(firstInteriorImage, interiorEnd)}。仅展示参考图能够支持的座舱、座椅和空间细节。`,
    `- 车场与展厅事实依据：${range(firstDealershipImage, dealershipEnd)}。仅展示用户上传素材能够支持的场地、陈列和车辆信息。`,
    `- 用户额外参考：${range(firstUserReferenceImage, userReferenceEnd)}。只补充构图和视觉信息，不覆盖预设风格与场景提示词。`,
    `- #audio1 是 MiniMax 根据固定数字人音色生成的${getVideoGenerationLanguageLabel(input.language)}口播音轨。视频总时长必须按 #audio1 的真实时长匹配，不要额外延长画面或补演口播。它是全片唯一人声与唯一口播内容，数字人口型、停顿和语速必须严格跟随 #audio1。`,
    "",
    input.finalVideoPrompt,
    "",
    "声音要求：直接使用 #audio1，不重新配音、不变声、不改写、不增加背景解说、价格、字幕或额外台词；允许加入极轻环境底噪，但不得盖过口播。",
    "口型要求：只有 #audio1 中真实有声音的时间段可以张嘴说话；当 #audio1 进入静音或无口播尾段时，数字人必须闭嘴，保持自然微笑、点头、看车或手势收尾，禁止继续无声张嘴、补说台词或模拟额外口播。",
    `#audio1 对应口播文本：${input.scriptText}`,
    "",
    `硬性约束：全片 ${durationSeconds} 秒；数字人与车辆同框介绍车型定位，中段展示外观、内饰、空间或活动信息；结尾跟随 #audio1 自然收束，不要在音频结束后继续张嘴或延长表演。保持人物身份、车辆身份和展厅空间连续一致。不得改变车标，不得虚构配置，不得生成其他车型，不得出现多余人物、畸形手指、漂浮部件或错误文字。`,
  ].join("\n");
};

const synthesizeNarrationAudio = async (input: {
  taskId: string;
  scriptText: string;
  voiceId: string;
  speed?: number;
  language: VideoGenerationLanguage;
}) => {
  const speed = 1;
  const speech = await minimaxClient.synthesizeSpeech({
    text: input.scriptText,
    voiceId: input.voiceId,
    speed,
    language: input.language,
  });

  if (!speech.durationMs) {
    throw errors.generationFailed("MiniMax narration audio response missing duration", {
      scriptLength: input.scriptText.length,
    });
  }

  if (speech.durationMs > MAX_NARRATION_AUDIO_DURATION_MS) {
    throw errors.generationFailed(
      "MiniMax narration audio exceeds the 15-second maximum",
      {
        audioDurationMs: speech.durationMs,
        scriptLength: input.scriptText.length,
        suggestion: "shorten the script text",
      },
    );
  }

  if (speech.durationMs < MIN_NARRATION_AUDIO_DURATION_MS) {
    throw errors.generationFailed(
      "MiniMax narration audio is shorter than the 12-second minimum",
      {
        audioDurationMs: speech.durationMs,
        scriptLength: input.scriptText.length,
        suggestion: "make the script text slightly longer",
      },
    );
  }

  await fs.mkdir(narrationAudioDir, { recursive: true });
  const fileName = `${input.taskId}.mp3`;
  const localPath = path.join(narrationAudioDir, fileName);
  await fs.writeFile(localPath, speech.audio);
  const publicUrl = `${env.publicBaseUrl.replace(/\/$/, "")}/results/video-generation/narration-audio/${fileName}`;

  return {
    localPath,
    publicUrl,
    durationMs: speech.durationMs,
    originalDurationMs: speech.durationMs,
    normalizedSpeechDurationMs: speech.durationMs,
    silencePadMs: 0,
    timeStretchRatio: null,
    originalLocalPath: localPath,
    originalPublicUrl: publicUrl,
    sizeBytes: speech.sizeBytes,
    originalSizeBytes: speech.sizeBytes,
    model: speech.model,
    voiceId: speech.voiceId,
    speed: speech.speed,
    language: input.language,
    languageBoost: speech.languageBoost,
  };
};

const synthesizeNarrationAudioWithAutoFit = async (input: {
  taskId: string;
  scriptText: string;
  voiceId: string;
  speed?: number;
  language: VideoGenerationLanguage;
}) => {
  let scriptText = input.scriptText.trim();
  const attempts: Array<{
    attempt: number;
    scriptText: string;
    durationMs?: number;
    status: "too_long" | "too_short" | "success";
  }> = [];

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const audio = await synthesizeNarrationAudio({
        ...input,
        scriptText,
      });
      attempts.push({
        attempt: attempt + 1,
        scriptText,
        durationMs: audio.durationMs,
        status: "success",
      });
      return {
        audio,
        scriptText,
        attempts,
      };
    } catch (error) {
      const isTooLong = isNarrationAudioTooLongError(error);
      const isTooShort = isNarrationAudioTooShortError(error);
      if ((!isTooLong && !isTooShort) || attempt === 4) {
        throw error;
      }
      const details = getGenerationErrorDetails(error);
      const durationMs =
        typeof details.audioDurationMs === "number"
          ? details.audioDurationMs
          : isTooShort
            ? MIN_NARRATION_AUDIO_DURATION_MS - 1
            : MAX_NARRATION_AUDIO_DURATION_MS + 1;
      attempts.push({
        attempt: attempt + 1,
        scriptText,
        durationMs,
        status: isTooShort ? "too_short" : "too_long",
      });
      if (isTooShort) {
        scriptText = extendNarrationScriptForDuration({
          scriptText,
          language: input.language,
        });
      } else {
        const shortened = shortenNarrationScriptForDuration({
          scriptText,
          language: input.language,
          currentDurationMs: durationMs,
          attempt: attempt + 1,
        });
        scriptText =
          shortened && shortened !== scriptText
            ? shortened
            : compactNarrationScript(scriptText, input.language);
      }
    }
  }

  throw errors.generationFailed("MiniMax narration audio could not be fitted under 15 seconds", {
    attempts,
  });
};

class VideoGenerationService {
  getWorkflowContract() {
    return videoGenerationWorkflowContract;
  }

  private async buildTemplateResponse(
    material: ReferenceMaterialRecord,
    definition: NonNullable<ReturnType<typeof getVideoTemplateDefinition>>,
  ) {
    const localizedMaterial = localizeReferenceMaterial(material);
    return {
      id: localizedMaterial.id,
      templateId: localizedMaterial.id,
      referenceMaterialId: localizedMaterial.id,
      title: localizedMaterial.title,
      type: definition.type,
      typeLabel: videoTemplateTypeLabels[definition.type],
      style: definition.style,
      styleLabel: videoTemplateStyleLabels[definition.style],
      badge: definition.badge,
      description: localizedMaterial.referenceRole,
      thumbnailUrl: toPublicReferencePreviewUrl(localizedMaterial.id),
      previewUrl: toPublicReferencePreviewUrl(localizedMaterial.id),
      prompt: conciseStylePrompt(localizedMaterial.stylePrompt),
      stylePrompt: conciseStylePrompt(localizedMaterial.stylePrompt),
      scenePrompt: localizedMaterial.scenePrompt ?? localizedMaterial.stylePrompt,
      shotPlan15s: localizedMaterial.shotPlan15s ?? [],
      styleTags: localizedMaterial.styleJson.styleTags,
      durationSeconds: VIDEO_DURATION_SECONDS,
      durationLabel: "00:15",
      outputRatio: "9:16" as const,
      videoResolution: VIDEO_GENERATION_RESOLUTION,
      generationMode: "preset_prompt_only" as const,
      inputRequirements: definition.inputRequirements,
      requiredFields: definition.inputRequirements
        .filter((item) => item.required)
        .map((item) => item.key),
      optionalFields: definition.inputRequirements
        .filter((item) => !item.required)
        .map((item) => item.key),
    };
  }

  async listTemplates(input: {
    type?: unknown;
    style?: unknown;
    search?: unknown;
  }) {
    const type =
      typeof input.type === "string" && input.type.trim()
        ? input.type.trim()
        : "";
    const style =
      typeof input.style === "string" && input.style.trim()
        ? input.style.trim()
        : "";
    const search =
      typeof input.search === "string" ? input.search.trim().toLowerCase() : "";
    const allowedTypes: VideoTemplateType[] = [
      "dealership",
      "single-car",
      "promotion",
      "market",
    ];
    const allowedStyles: VideoTemplateStyle[] = [
      "calm",
      "lively",
      "professional",
      "humorous",
    ];
    if (type && !allowedTypes.includes(type as VideoTemplateType)) {
      throw errors.invalidParameter("template type is invalid", { type });
    }
    if (style && !allowedStyles.includes(style as VideoTemplateStyle)) {
      throw errors.invalidParameter("template style is invalid", { style });
    }

    const manifest = await readJson<ReferenceMaterialManifest>(
      referenceManifestPath,
    );
    const materialById = new Map(
      manifest.materials
        .filter((material) => material.extractionStatus === "completed")
        .map(localizeReferenceMaterial)
        .map((material) => [material.id, material]),
    );
    const items = [];
    for (const definition of listVideoTemplateDefinitions()) {
      const material = materialById.get(definition.referenceMaterialId);
      if (!material) continue;
      if (type && definition.type !== type) continue;
      if (style && definition.style !== style) continue;
      if (
        search &&
        ![
          material.title,
          material.referenceRole,
          material.stylePrompt,
          ...material.styleJson.styleTags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search)
      ) {
        continue;
      }
      items.push(await this.buildTemplateResponse(material, definition));
    }

    return {
      items,
      total: items.length,
      filters: {
        type: type || null,
        style: style || null,
        search: search || null,
      },
      capabilities: videoGenerationWorkflowContract.templateCapabilities,
    };
  }

  async getTemplate(templateId: string) {
    const definition = getVideoTemplateDefinition(templateId);
    if (!definition) {
      throw errors.invalidParameter("templateId is invalid", { templateId });
    }
    const material = await this.getReferenceMaterial(templateId);
    return this.buildTemplateResponse(material, definition);
  }

  async validateTemplateInputs(templateId: string, body: unknown) {
    const definition = getVideoTemplateDefinition(templateId);
    if (!definition) {
      throw errors.invalidParameter("templateId is invalid", { templateId });
    }
    return {
      templateId,
      templateType: definition.type,
      ...validateVideoTemplateInputs(definition, body),
    };
  }

  async listDigitalHumans() {
    const manifest = await readJson<DigitalHumanManifest>(digitalHumanManifestPath);
    const activeItems = manifest.items
      .filter((item) => item.status === "active")
      .map(localizeDigitalHumanRecord)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const voices = await digitalHumanVoiceRepository.listByDigitalHumanIds(
      activeItems.map((item) => item.id),
    );
    const voiceByDigitalHumanId = new Map(
      voices.map((voice) => [voice.digitalHumanId, voice]),
    );

    return activeItems
      .map((item) => {
        const presetVoice = toPresetDigitalHumanVoice(item);
        return {
        id: item.id,
        name: item.name,
        gender: item.gender,
        ageStyle: item.ageStyle,
        previewUrl: toPublicDigitalHumanAssetUrl(item.id),
        imageUrl: toPublicDigitalHumanAssetUrl(item.id),
        frontPreviewStrategy: item.frontPreviewStrategy,
        voiceStatus:
          voiceByDigitalHumanId.get(item.id)?.status === "ready" || presetVoice
            ? "ready"
            : "not_configured",
        voiceModel: voiceByDigitalHumanId.get(item.id)?.model ?? presetVoice?.model ?? null,
        };
      });
  }

  async getDigitalHuman(id: string) {
    const manifest = await readJson<DigitalHumanManifest>(digitalHumanManifestPath);
    const item = manifest.items.find((candidate) => candidate.id === id && candidate.status === "active");
    if (!item) {
      throw errors.invalidParameter("digitalHumanId is invalid", { digitalHumanId: id });
    }
    return localizeDigitalHumanRecord(item);
  }

  async getDigitalHumanImagePath(id: string) {
    const item = await this.getDigitalHuman(id);
    const imagePath = path.resolve(workspaceRoot, item.imagePath);
    if (!imagePath.startsWith(workspaceRoot)) {
      throw errors.invalidParameter("digital human image path is invalid", { id });
    }
    return imagePath;
  }

  private async getEffectiveDigitalHumanVoice(id: string) {
    const digitalHuman = await this.getDigitalHuman(id);
    const voice = await digitalHumanVoiceRepository.findByDigitalHumanId(id);
    if (voice?.status === "ready") {
      return {
        digitalHumanId: voice.digitalHumanId,
        status: voice.status,
        voiceId: voice.voiceId,
        model: voice.model,
        sourceFileName: voice.sourceFileName,
        updatedAt: voice.updatedAt,
        speed: undefined,
        source: "db_voice_clone" as const,
      };
    }
    return toPresetDigitalHumanVoice(digitalHuman);
  }

  async getDigitalHumanVoice(id: string) {
    const voice = await this.getEffectiveDigitalHumanVoice(id);
    if (!voice) {
      return {
        digitalHumanId: id,
        status: "not_configured",
        voiceId: null,
        model: env.minimax.speechModel,
      };
    }
    return {
      digitalHumanId: id,
      status: voice.status,
      voiceId: voice.voiceId,
      model: voice.model,
      sourceFileName: voice.sourceFileName,
      updatedAt: voice.updatedAt ? voice.updatedAt.toISOString() : null,
      source: voice.source,
    };
  }

  async cloneDigitalHumanVoice(input: {
    digitalHumanId: string;
    file: Express.Multer.File;
    userId: string;
  }) {
    await this.getDigitalHuman(input.digitalHumanId);
    const extension = path.extname(input.file.originalname).toLowerCase();
    if (![".mp3", ".m4a", ".wav"].includes(extension)) {
      throw errors.fileTypeUnsupported({
        allowedExtensions: [".mp3", ".m4a", ".wav"],
      });
    }

    const normalizedId = input.digitalHumanId
      .replace(/[^a-z0-9_]/gi, "_")
      .slice(0, 40);
    const voiceId = `ucp_${normalizedId}_${Date.now().toString(36)}`;
    const uploaded = await minimaxClient.uploadCloneAudio(input.file.path);
    await minimaxClient.cloneVoice({
      fileId: uploaded.fileId,
      voiceId,
    });

    const voice = await digitalHumanVoiceRepository.upsert({
      digitalHumanId: input.digitalHumanId,
      voiceId,
      sourceFileId: uploaded.fileId,
      sourceFileName: input.file.originalname,
      sourceMimeType: input.file.mimetype || "application/octet-stream",
      sourceLocalPath: input.file.path,
      model: env.minimax.speechModel,
      status: "ready",
      createdByUserId: input.userId,
      metadata: {
        sourceSize: input.file.size,
        clonedAt: new Date().toISOString(),
      },
    });
    if (!voice) {
      throw errors.generationFailed("digital human voice clone was not persisted");
    }

    return {
      digitalHumanId: voice.digitalHumanId,
      status: voice.status,
      voiceId: voice.voiceId,
      model: voice.model,
      sourceFileName: voice.sourceFileName,
      updatedAt: voice.updatedAt.toISOString(),
    };
  }

  async listReferenceMaterials() {
    const manifest = await readJson<ReferenceMaterialManifest>(referenceManifestPath);
    return manifest.materials
      .filter((material) => material.extractionStatus === "completed")
      .map(localizeReferenceMaterial)
      .map((material) => ({
        id: material.id,
        title: material.title,
        videoType: material.videoType,
        referenceRole: material.referenceRole,
        previewUrl: toPublicReferencePreviewUrl(material.id),
        media: material.media,
        styleTags: material.styleJson.styleTags,
        stylePrompt: conciseStylePrompt(material.stylePrompt),
        scenePrompt: material.scenePrompt ?? material.stylePrompt,
        shotPlan15s: material.shotPlan15s ?? [],
        generationMode: "preset_prompt_only",
      }));
  }

  async getReferenceMaterial(id: string) {
    const manifest = await readJson<ReferenceMaterialManifest>(referenceManifestPath);
    const material = manifest.materials.find((candidate) => candidate.id === id);
    if (!material || material.extractionStatus !== "completed") {
      throw errors.invalidParameter("referenceMaterialId is invalid or not extracted", {
        referenceMaterialId: id,
      });
    }
    return localizeReferenceMaterial(material);
  }

  async getReferencePreviewPath(id: string) {
    const material = await this.getReferenceMaterial(id);
    if (!material.previewImagePath) {
      throw errors.invalidParameter("reference material preview is missing", { id });
    }
    const previewPath = path.resolve(workspaceRoot, material.previewImagePath);
    if (!previewPath.startsWith(workspaceRoot)) {
      throw errors.invalidParameter("reference preview path is invalid", { id });
    }
    return previewPath;
  }

  private async validateAssetIds(input: {
    userId: string;
    assetIds: string[];
    role: string;
    allowedPurposes: AssetPurpose[];
    minCount: number;
    maxCount: number;
  }) {
    const ids = unique(input.assetIds);
    if (ids.length < input.minCount) {
      throw errors.invalidParameter(`${input.role} requires at least ${input.minCount} asset(s)`, {
        role: input.role,
        minCount: input.minCount,
      });
    }
    if (ids.length > input.maxCount) {
      throw errors.invalidParameter(`${input.role} supports at most ${input.maxCount} assets`, {
        role: input.role,
        maxCount: input.maxCount,
      });
    }

    const assets: AssetRecord[] = [];
    for (const assetId of ids) {
      const asset = await assetsRepository.findById(assetId, input.userId);
      if (!asset) {
        throw errors.assetNotFound();
      }
      assertAssetPurpose(asset, input.allowedPurposes, input.role);
      assets.push(asset);
    }
    return assets;
  }

  private async validateUploadedAssets(
    body: CreateScriptDraftInput,
    userId: string,
    templateType: VideoTemplateType,
  ): Promise<ValidatedAssets> {
    if (templateType === "market") {
      throw errors.invalidParameter(
        "market template is unavailable until reference materials are ready",
      );
    }
    const isDealership = templateType === "dealership";
    const vehicleExteriorAssets = await this.validateAssetIds({
      userId,
      assetIds: asStringArray(body.vehicleExteriorAssetIds),
      role: "vehicleExteriorAssetIds",
      allowedPurposes: ["car_exterior"],
      minCount: isDealership ? 0 : 1,
      maxCount: isDealership ? 0 : 6,
    });

    const vehicleInteriorAssets = await this.validateAssetIds({
      userId,
      assetIds: asStringArray(body.vehicleInteriorAssetIds),
      role: "vehicleInteriorAssetIds",
      allowedPurposes: ["car_interior"],
      minCount: 0,
      maxCount: isDealership ? 0 : 6,
    });

    const userReferenceAssets = await this.validateAssetIds({
      userId,
      assetIds: asStringArray(body.userReferenceAssetIds),
      role: "userReferenceAssetIds",
      allowedPurposes: ["video_reference_image", "car_exterior", "car_interior"],
      minCount: 0,
      maxCount: 4,
    });
    const dealershipAssets = await this.validateAssetIds({
      userId,
      assetIds: asStringArray(body.dealershipImageAssetIds),
      role: "dealershipImageAssetIds",
      allowedPurposes: ["video_reference_image"],
      minCount: isDealership ? 1 : 0,
      maxCount: 6,
    });

    return {
      vehicleExteriorAssets,
      vehicleInteriorAssets,
      userReferenceAssets,
      dealershipAssets,
    };
  }

  async createScriptDraft(body: CreateScriptDraftInput, userId: string) {
    const digitalHumanId = typeof body.digitalHumanId === "string" ? body.digitalHumanId.trim() : "";
    const templateId =
      typeof body.templateId === "string" ? body.templateId.trim() : "";
    const legacyReferenceMaterialId =
      typeof body.referenceMaterialId === "string"
        ? body.referenceMaterialId.trim()
        : "";
    if (
      templateId &&
      legacyReferenceMaterialId &&
      templateId !== legacyReferenceMaterialId
    ) {
      throw errors.invalidParameter(
        "templateId and referenceMaterialId must match",
        {
          templateId,
          referenceMaterialId: legacyReferenceMaterialId,
        },
      );
    }
    const referenceMaterialId = templateId || legacyReferenceMaterialId;
    if (!digitalHumanId) throw errors.invalidParameter("digitalHumanId is required");
    if (!referenceMaterialId) throw errors.invalidParameter("templateId is required");
    const templateDefinition =
      getVideoTemplateDefinition(referenceMaterialId);
    if (!templateDefinition) {
      throw errors.invalidParameter("templateId is invalid", {
        templateId: referenceMaterialId,
      });
    }
    if (templateDefinition.type === "market") {
      throw errors.invalidParameter(
        "market template is unavailable until reference materials are ready",
        { templateId: referenceMaterialId },
      );
    }
    const language = normalizeVideoGenerationLanguage(body.language);
    const promotionText = normalizeOptionalTextField(
      body.promotionText,
      "promotionText",
      160,
    );
    const dealershipName = normalizeOptionalTextField(
      body.dealershipName,
      "dealershipName",
      60,
    );
    const featuredVehicleNames = normalizeOptionalTextField(
      body.featuredVehicleNames,
      "featuredVehicleNames",
      160,
    );
    if (templateDefinition.type === "promotion" && promotionText.length < 2) {
      throw errors.invalidParameter("promotionText is required");
    }
    if (
      templateDefinition.type === "dealership" &&
      dealershipName.length < 2
    ) {
      throw errors.invalidParameter("dealershipName is required");
    }
    const normalizedVehicle =
      templateDefinition.type === "dealership"
        ? {
            vehicleName: dealershipName,
            structuredVehicle: null,
          }
        : normalizeVehicleInput(body);
    const { vehicleName, structuredVehicle } = normalizedVehicle;

    const durationSeconds = normalizeDuration(body.durationSeconds);
    const sellingPointHints = normalizeSellingPointHints(body.sellingPointHints);
    const vehicleImageSummary =
      typeof body.vehicleImageSummary === "string" ? body.vehicleImageSummary.trim().slice(0, 500) : "";

    const [digitalHuman, referenceMaterial, uploadedAssets, digitalHumanVoice] = await Promise.all([
      this.getDigitalHuman(digitalHumanId),
      this.getReferenceMaterial(referenceMaterialId),
      this.validateUploadedAssets(body, userId, templateDefinition.type),
      digitalHumanVoiceRepository.findByDigitalHumanId(digitalHumanId),
    ]);

    const scriptPrompt = buildScriptPrompt({
      vehicleName,
      durationSeconds,
      referenceMaterial,
      sellingPointHints,
      vehicleImageSummary,
      language,
      templateType: templateDefinition.type,
      promotionText,
      dealershipName,
      featuredVehicleNames,
    });
    const fallbackScriptText = buildScriptText({
      vehicleName,
      referenceMaterial,
      sellingPointHints,
      vehicleImageSummary,
      language,
      templateType: templateDefinition.type,
      promotionText,
      dealershipName,
      featuredVehicleNames,
    });
    const fallbackShotCues = buildShotCues({
      vehicleName,
      referenceMaterial,
      scriptText: fallbackScriptText,
      templateType: templateDefinition.type,
    });
    const fallbackVehicleProfile = buildFallbackProfile({
      subjectName: vehicleName,
      templateType: templateDefinition.type,
      featuredVehicleNames,
    });
    const assetSummary = [
      `外观图 ${uploadedAssets.vehicleExteriorAssets.length} 张：${uploadedAssets.vehicleExteriorAssets.map((asset) => asset.fileName).join("、")}`,
      `内饰图 ${uploadedAssets.vehicleInteriorAssets.length} 张：${uploadedAssets.vehicleInteriorAssets.map((asset) => asset.fileName).join("、") || "无"}`,
      `额外参考图 ${uploadedAssets.userReferenceAssets.length} 张：${uploadedAssets.userReferenceAssets.map((asset) => asset.fileName).join("、") || "无"}`,
      `车场/展厅图 ${uploadedAssets.dealershipAssets.length} 张：${uploadedAssets.dealershipAssets.map((asset) => asset.fileName).join("、") || "无"}`,
    ].join("\n");
    let deepSeekDraft: Awaited<ReturnType<typeof deepSeekClient.createScriptDraft>> = null;
    let deepSeekFailureNote = "";
    try {
      deepSeekDraft = await deepSeekClient.createScriptDraft({
        systemPrompt: buildDeepSeekSystemPrompt({
          language,
          templateType: templateDefinition.type,
        }),
        userPrompt: buildDeepSeekUserPrompt({
          vehicleName,
          durationSeconds,
          referenceMaterial,
          sellingPointHints,
          vehicleImageSummary,
          assetSummary,
          language,
          templateType: templateDefinition.type,
          promotionText,
          dealershipName,
          featuredVehicleNames,
        }),
      });
    } catch (error) {
      deepSeekFailureNote = error instanceof Error ? error.message : "unknown DeepSeek error";
    }
    if (!deepSeekDraft && !canUseLocalScriptFallback(language)) {
      throw errors.generationFailed(
        "DeepSeek script generation is required for selected narration language",
        {
          language,
          targetLanguage: getVideoGenerationLanguageLabel(language),
          deepSeekFailureNote,
        },
      );
    }
    const generatedDraft = mergeGeneratedDraft({
      vehicleName,
      vehicleProfile: fallbackVehicleProfile,
      scriptText: fallbackScriptText,
      openingHook: fallbackScriptText.split("。")[0] || fallbackScriptText,
      sellingPoints: sellingPointHints.length
        ? sellingPointHints
        : fallbackVehicleProfile.recognizedHighlights,
      shotCues: fallbackShotCues,
      riskNotes: [
        "车型名称未提供完整车况、里程和价格时，文案不会编造这些信息。",
      ],
    }, deepSeekDraft);
    const scriptText = compactNarrationScript(generatedDraft.scriptText, language);
    const shotCues = generatedDraft.shotCues;

    const promptBundle = {
      digitalHumanPrompt: `使用数字人「${digitalHuman.name}」（${digitalHuman.gender}，${digitalHuman.ageStyle}）作为口播主体，参考其四视图与人物特写保持身份一致。`,
      stylePrompt: conciseStylePrompt(referenceMaterial.stylePrompt),
      sceneShotPlanPrompt: toSceneShotPlanPrompt(referenceMaterial),
      scriptPrompt,
      uploadedReferencePrompt: [
        `外观参考图 ${uploadedAssets.vehicleExteriorAssets.length} 张：必须锁定车辆外观、颜色、车身结构、灯组、轮毂和真实车况。`,
        `内饰参考图 ${uploadedAssets.vehicleInteriorAssets.length} 张：如存在，必须用于座舱、空间、材质和配置展示。`,
        `车场/展厅参考图 ${uploadedAssets.dealershipAssets.length} 张：如存在，必须锁定真实空间、车辆陈列和场地布局。`,
        `用户额外参考图 ${uploadedAssets.userReferenceAssets.length} 张：只作为补充构图/场景/品牌参考，不覆盖参考视频风格。`,
      ].join("\n"),
    };

    const requiredInputs = {
      vehicle: {
        vehicleName,
        structured: structuredVehicle,
        language,
      },
      template: {
        id: referenceMaterialId,
        type: templateDefinition.type,
        typeLabel: videoTemplateTypeLabels[templateDefinition.type],
        promotionText: promotionText || null,
        dealershipName: dealershipName || null,
        featuredVehicleNames: featuredVehicleNames || null,
      },
      digitalHuman: {
        id: digitalHuman.id,
        name: digitalHuman.name,
        gender: digitalHuman.gender,
        imageUrl: toPublicDigitalHumanAssetUrl(digitalHuman.id),
        voiceStatus:
          digitalHumanVoice?.status === "ready" ? "ready" : "not_configured",
        voiceModel: digitalHumanVoice?.model ?? env.minimax.speechModel,
      },
      referenceMaterial: {
        id: referenceMaterial.id,
        templateId: referenceMaterial.id,
        title: referenceMaterial.title,
        videoType: referenceMaterial.videoType,
        stylePrompt: conciseStylePrompt(referenceMaterial.stylePrompt),
        scenePrompt: referenceMaterial.scenePrompt ?? referenceMaterial.stylePrompt,
        shotPlan15s: referenceMaterial.shotPlan15s ?? [],
        generationMode: "preset_prompt_only",
        previewUrl: toPublicReferencePreviewUrl(referenceMaterial.id),
      },
      script: {
        vehicleProfile: generatedDraft.vehicleProfile,
        openingHook: generatedDraft.openingHook,
        scriptPrompt,
        scriptText,
        sellingPoints: generatedDraft.sellingPoints,
        shotCues,
        generator: deepSeekDraft
          ? generatedDraft.usedGeneratedScript
            ? "deepseek"
            : "deepseek_safety_fallback"
          : deepSeekFailureNote
            ? "local_fallback_after_deepseek_error"
            : "local_fallback",
      },
      uploadedReferences: {
        vehicleExteriorAssets: uploadedAssets.vehicleExteriorAssets.map(summarizeAsset),
        vehicleInteriorAssets: uploadedAssets.vehicleInteriorAssets.map(summarizeAsset),
        userReferenceAssets: uploadedAssets.userReferenceAssets.map(summarizeAsset),
        dealershipAssets: uploadedAssets.dealershipAssets.map(summarizeAsset),
      },
    };

    const scriptDraftId = createId("video_script");
    const riskNotes = [
      ...generatedDraft.riskNotes,
      deepSeekDraft
        ? "口播文案由 DeepSeek 生成。"
        : deepSeekFailureNote
          ? `DeepSeek 本次生成失败，后端已自动使用安全兜底文案：${deepSeekFailureNote}`
          : "当前未配置 DeepSeek API key，口播文案由后端本地草稿生成器生成。",
    ];
    const finalVideoPrompt = [
      promptBundle.digitalHumanPrompt,
      promptBundle.stylePrompt,
      promptBundle.sceneShotPlanPrompt,
      [
        `${videoTemplateTypeLabels[templateDefinition.type]}重点：`,
        `内容主体：${vehicleName}`,
        `口播语言：${getVideoGenerationLanguageLabel(language)}`,
        `车型级别：${generatedDraft.vehicleProfile.vehicleClass}`,
        `市场定位：${generatedDraft.vehicleProfile.marketPositioning}`,
        `目标人群：${generatedDraft.vehicleProfile.targetUsers.join("、")}`,
        `使用场景：${generatedDraft.vehicleProfile.useCases.join("、")}`,
        `核心卖点：${generatedDraft.vehicleProfile.recognizedHighlights.join("、")}`,
        `不可写死的信息：${generatedDraft.vehicleProfile.uncertainItems.join("、")}`,
        promotionText ? `用户确认的优惠信息：${promotionText}` : "",
        featuredVehicleNames ? `用户填写的主推车型：${featuredVehicleNames}` : "",
      ].join("\n"),
      `口播文案：${scriptText}`,
      `视频时长上限：${VIDEO_DURATION_SECONDS} 秒；实际生成时长以后续 MiniMax 口播音频时长为准，镜头节奏参考 ${FIXED_SHOT_TIME_RANGES.join("、")}。`,
      promptBundle.uploadedReferencePrompt,
      "视频生成时必须同时包含数字人、预设风格与场景提示词、口播文案、用户上传车辆参考素材；参考视频本身不得上传给视频模型。",
    ].join("\n\n");

    const response = {
      scriptDraftId,
      templateId: referenceMaterialId,
      templateType: templateDefinition.type,
      status: "ready_for_video_generation",
      vehicleName,
      structuredVehicle,
      language,
      durationSeconds,
      outputRatio: "9:16" as const,
      videoResolution: VIDEO_GENERATION_RESOLUTION,
      requiredInputs,
      promptBundle,
      finalVideoPrompt,
      riskNotes,
    };

    await videoScriptDraftRepository.create({
      id: scriptDraftId,
      userId,
      vehicleName,
      digitalHumanId,
      referenceMaterialId,
      durationSeconds: VIDEO_DURATION_SECONDS,
      outputRatio: "9:16",
      videoResolution: VIDEO_GENERATION_RESOLUTION,
      scriptText,
      finalVideoPrompt,
      requiredInputs,
      promptBundle,
      riskNotes,
    });

    return response;
  }

  async getScriptDraft(scriptDraftId: string, userId: string) {
    const draft = await videoScriptDraftRepository.findById(scriptDraftId, userId);
    if (!draft) throw errors.videoScriptDraftNotFound();
    const vehicle = asRecord(asRecord(draft.requiredInputs).vehicle);
    return {
      scriptDraftId: draft.id,
      templateId: draft.referenceMaterialId,
      templateType:
        typeof asRecord(asRecord(draft.requiredInputs).template).type ===
        "string"
          ? asRecord(asRecord(draft.requiredInputs).template).type
          : getVideoTemplateDefinition(draft.referenceMaterialId)?.type ??
            "single-car",
      status: "ready_for_video_generation",
      vehicleName: draft.vehicleName,
      structuredVehicle: vehicle.structured ?? null,
      language:
        typeof vehicle.language === "string" ? vehicle.language : "Chinese",
      durationSeconds: draft.durationSeconds,
      outputRatio: draft.outputRatio,
      videoResolution: draft.videoResolution,
      requiredInputs: draft.requiredInputs,
      promptBundle: draft.promptBundle,
      finalVideoPrompt: draft.finalVideoPrompt,
      riskNotes: draft.riskNotes,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    };
  }

  async createVideoTask(
    body: CreateVideoTaskInput,
    userId: string,
    context?: BillingRequestContext,
  ) {
    const scriptDraftId =
      typeof body.scriptDraftId === "string" ? body.scriptDraftId.trim() : "";
    if (!scriptDraftId) {
      throw errors.invalidParameter("scriptDraftId is required");
    }

    const draft = await videoScriptDraftRepository.findById(scriptDraftId, userId);
    if (!draft) throw errors.videoScriptDraftNotFound();
    const digitalHumanVoice =
      await this.getEffectiveDigitalHumanVoice(draft.digitalHumanId);
    if (!digitalHumanVoice || digitalHumanVoice.status !== "ready") {
      throw errors.invalidParameter(
        "selected digital human has no ready MiniMax voice clone",
        {
          digitalHumanId: draft.digitalHumanId,
          setupEndpoint: `/api/v1/modules/video-generation/digital-humans/${encodeURIComponent(draft.digitalHumanId)}/voice-clone`,
        },
      );
    }

    const subscription = await assertCanStartGeneration(context, {
      moduleCodes: ["video-generation"],
    });
    const ids = draftAssetIds(draft);
    const requiredInputs = asRecord(draft.requiredInputs);
    const vehicleInput = asRecord(requiredInputs.vehicle);
    const templateInput = asRecord(requiredInputs.template);
    const language = normalizeVideoGenerationLanguage(vehicleInput.language);
    const templateDefinition = getVideoTemplateDefinition(
      draft.referenceMaterialId,
    );
    const templateType =
      (typeof templateInput.type === "string"
        ? templateInput.type
        : templateDefinition?.type ?? "single-car") as VideoTemplateType;
    const [digitalHumanPath, exteriorAssets, interiorAssets, userReferenceAssets, dealershipAssets] =
      await Promise.all([
        this.getDigitalHumanImagePath(draft.digitalHumanId),
        this.validateAssetIds({
          userId,
          assetIds: ids.exteriorIds.slice(0, 5),
          role: "vehicleExteriorAssetIds",
          allowedPurposes: ["car_exterior"],
          minCount: templateType === "dealership" ? 0 : 1,
          maxCount: 5,
        }),
        this.validateAssetIds({
          userId,
          assetIds: ids.interiorIds.slice(0, 3),
          role: "vehicleInteriorAssetIds",
          allowedPurposes: ["car_interior"],
          minCount: 0,
          maxCount: 3,
        }),
        this.validateAssetIds({
          userId,
          assetIds: ids.userReferenceIds.slice(0, 2),
          role: "userReferenceAssetIds",
          allowedPurposes: ["video_reference_image", "car_exterior", "car_interior"],
          minCount: 0,
          maxCount: 2,
        }),
        this.validateAssetIds({
          userId,
          assetIds: ids.dealershipIds.slice(0, 6),
          role: "dealershipImageAssetIds",
          allowedPurposes: ["video_reference_image"],
          minCount: templateType === "dealership" ? 1 : 0,
          maxCount: 6,
        }),
      ]);

    const seedanceExteriorAssets =
      templateType === "single-car" ? exteriorAssets.slice(0, 4) : exteriorAssets;
    const seedanceInteriorAssets =
      templateType === "single-car" ? interiorAssets.slice(0, 3) : interiorAssets;
    const seedanceUserReferenceAssets =
      templateType === "single-car" || templateType === "dealership"
        ? []
        : userReferenceAssets;
    const seedanceDealershipAssets =
      templateType === "dealership" ? dealershipAssets.slice(0, 1) : dealershipAssets;
    const selectedVehicleAssets = [
      ...seedanceExteriorAssets,
      ...seedanceInteriorAssets,
      ...seedanceDealershipAssets,
      ...seedanceUserReferenceAssets,
    ];
    const taskId = createId("task");
    let taskCreated = false;
    let billing: FrozenGenerationBilling | null = null;
    let billingFreezeFailed = false;

    try {
      const fittedNarration = await synthesizeNarrationAudioWithAutoFit({
        taskId,
        scriptText: draft.scriptText,
        voiceId: digitalHumanVoice.voiceId,
        speed: digitalHumanVoice.speed,
        language,
      });
      const narrationAudio = fittedNarration.audio;
      const narrationScriptText = fittedNarration.scriptText;
      const seedanceDurationSeconds = deriveSeedanceDurationSeconds(
        narrationAudio.durationMs,
      );
      const seedancePrompt = buildSeedancePrompt({
        finalVideoPrompt: draft.finalVideoPrompt,
        scriptText: narrationScriptText,
        exteriorCount: seedanceExteriorAssets.length,
        interiorCount: seedanceInteriorAssets.length,
        userReferenceCount: seedanceUserReferenceAssets.length,
        dealershipCount: seedanceDealershipAssets.length,
        language,
        templateType,
        durationSeconds: seedanceDurationSeconds,
        audioDurationMs: narrationAudio.durationMs,
      });

      await tasksRepository.createWaitingTask({
        id: taskId,
        userId: subscription.userKey,
        moduleCode: "video-generation",
        inputAssetId:
          exteriorAssets[0]?.id ?? dealershipAssets[0]?.id ?? null,
        optionId: scriptDraftId,
        outputRatio: "9:16",
        resolution: VIDEO_GENERATION_RESOLUTION,
        logoAssetId: null,
        prompt: seedancePrompt,
        subscriptionUserKey: subscription.userKey,
        subscriptionPlanCode: subscription.planCode,
      });
      taskCreated = true;

      try {
        billing = await freezeGenerationBilling({
          taskId,
          functionCode: "video-generation",
          estimatedPoints: shortVideoGenerationPoints(),
          body: {},
          context,
        });
      } catch (error) {
        billingFreezeFailed = true;
        await tasksRepository.markFailed(
          taskId,
          "BILLING_FREEZE_FAILED",
          error instanceof Error ? error.message : "billing freeze failed",
        );
        throw error;
      }

      const digitalHumanAsset = await arkVirtualAssetService.ensureLocalFileAsset({
        userId: subscription.userKey,
        assetType: "Image",
        filePath: digitalHumanPath,
        fileName: `${draft.digitalHumanId}${path.extname(digitalHumanPath) || ".png"}`,
      });
      const vehicleVirtualAssets = await Promise.all(
        selectedVehicleAssets.map((asset) =>
          arkVirtualAssetService.ensureLocalFileAsset({
            userId: subscription.userKey,
            assetType: "Image",
            filePath: asset.localPath,
            publicUrl: asset.publicUrl,
            fileName: asset.fileName,
          }),
        ),
      );
      const narrationAudioAsset = await arkVirtualAssetService.ensureLocalFileAsset({
        userId: subscription.userKey,
        assetType: "Audio",
        filePath: narrationAudio.localPath,
        publicUrl: narrationAudio.publicUrl,
        fileName: path.basename(narrationAudio.localPath),
      });

      const inputAssetUris = [
        digitalHumanAsset.assetUri,
        ...vehicleVirtualAssets.map((item) => item.assetUri),
        narrationAudioAsset.assetUri,
      ].filter((item): item is string => typeof item === "string" && item.startsWith("asset://"));
      if (inputAssetUris.length > 12) {
        throw errors.invalidParameter("Seedance supports at most 12 reference files", {
          inputCount: inputAssetUris.length,
        });
      }
      if (inputAssetUris.length !== selectedVehicleAssets.length + 2) {
        throw errors.generationFailed("ark virtual asset uri is missing", {
          expectedInputCount: selectedVehicleAssets.length + 2,
          actualInputCount: inputAssetUris.length,
        });
      }

      const referenceImageAssetUris = [
        digitalHumanAsset.assetUri,
        ...vehicleVirtualAssets.map((item) => item.assetUri),
      ].filter((item): item is string => typeof item === "string" && item.startsWith("asset://"));
      const referenceAudioAssetUris = [narrationAudioAsset.assetUri].filter(
        (item): item is string => typeof item === "string" && item.startsWith("asset://"),
      );
      const orderedReferenceContents: ArkReferenceContent[] | undefined =
        templateType === "single-car" &&
        digitalHumanAsset.assetUri &&
        narrationAudioAsset.assetUri
          ? [
              {
                type: "image_url",
                role: "reference_image",
                image_url: { url: digitalHumanAsset.assetUri },
              },
              {
                type: "audio_url",
                role: "reference_audio",
                audio_url: { url: narrationAudioAsset.assetUri },
              },
              ...vehicleVirtualAssets
                .map((item): ArkReferenceContent | null =>
                  item.assetUri
                    ? {
                        type: "image_url",
                        role: "reference_image",
                        image_url: { url: item.assetUri },
                      }
                    : null,
                )
                .filter((item): item is ArkReferenceContent => Boolean(item)),
            ]
          : templateType === "dealership" &&
              vehicleVirtualAssets[0]?.assetUri &&
              digitalHumanAsset.assetUri &&
              narrationAudioAsset.assetUri
            ? [
                {
                  type: "image_url",
                  role: "reference_image",
                  image_url: { url: vehicleVirtualAssets[0].assetUri },
                },
                {
                  type: "image_url",
                  role: "reference_image",
                  image_url: { url: digitalHumanAsset.assetUri },
                },
                {
                  type: "audio_url",
                  role: "reference_audio",
                  audio_url: { url: narrationAudioAsset.assetUri },
                },
              ]
            : undefined;
      const publicSourceUrls = [
        digitalHumanAsset.publicUrl,
        ...vehicleVirtualAssets.map((item) => item.publicUrl),
        narrationAudioAsset.publicUrl,
      ];

      const arkTask = await arkClient.createSeedanceVideoTask({
        prompt: seedancePrompt,
        referenceContents: orderedReferenceContents,
        referenceImageUrls: referenceImageAssetUris,
        referenceAudioUrls: referenceAudioAssetUris,
        ratio: "9:16",
        resolution: VIDEO_GENERATION_RESOLUTION,
        duration: seedanceDurationSeconds,
        generateAudio: true,
      });

      await tasksRepository.markSubmitted({
        id: taskId,
        kieTaskId: arkTask.taskId,
        kieAccountHash: "ark",
        model: env.ark.videoModel,
        role: "primary",
        attemptNo: 1,
        requestJson: {
          provider: "ark",
          model: env.ark.videoModel,
          moduleCode: "video-generation",
          scriptDraftId,
          vehicleName: draft.vehicleName,
          templateId: draft.referenceMaterialId,
          templateType,
          language,
          prompt: seedancePrompt,
          projectName: env.ark.projectName,
          inputAssetUris,
          publicSourceUrls,
          referenceImageAssetUris,
          referenceAudioAssetUris,
          referenceContents: orderedReferenceContents,
          mediaInputs: {
            digitalHuman: {
              tag: templateType === "dealership" ? "{{Mixed 2}}" : "{{Mixed 1}}",
              digitalHumanId: draft.digitalHumanId,
              assetUri: digitalHumanAsset.assetUri,
              publicSourceUrl: digitalHumanAsset.publicUrl,
              providerAssetId: digitalHumanAsset.providerAssetId,
            },
            stylePreset: {
              referenceMaterialId: draft.referenceMaterialId,
              mode: "preset_prompt_only",
              uploadedToArk: false,
              prompt: conciseStylePrompt(
                String(asRecord(draft.promptBundle).stylePrompt ?? ""),
              ),
            },
            vehicleAssets: selectedVehicleAssets.map((asset, index) => ({
              tag:
                templateType === "dealership"
                  ? `{{Mixed ${index + 1}}}`
                  : `{{Mixed ${index + 3}}}`,
              assetId: asset.id,
              purpose: asset.purpose,
              assetUri: vehicleVirtualAssets[index].assetUri,
              publicSourceUrl: vehicleVirtualAssets[index].publicUrl,
              providerAssetId: vehicleVirtualAssets[index].providerAssetId,
            })),
            narrationAudio: {
              tag: templateType === "dealership" ? "{{Mixed 3}}" : "{{Mixed 2}}",
              provider: "minimax",
              model: narrationAudio.model,
              voiceId: narrationAudio.voiceId,
              usage: "seedance_reference_audio_for_generation",
              scriptText: narrationScriptText,
              fitAttempts: fittedNarration.attempts,
              durationMs: narrationAudio.durationMs,
              originalDurationMs: narrationAudio.originalDurationMs,
              normalizedSpeechDurationMs: narrationAudio.normalizedSpeechDurationMs,
              silencePadMs: narrationAudio.silencePadMs,
              timeStretchRatio: narrationAudio.timeStretchRatio,
              speed: narrationAudio.speed,
              sizeBytes: narrationAudio.sizeBytes,
              originalSizeBytes: narrationAudio.originalSizeBytes,
              localUrl: narrationAudio.publicUrl,
              localPath: narrationAudio.localPath,
              originalLocalUrl: narrationAudio.originalPublicUrl,
              originalLocalPath: narrationAudio.originalLocalPath,
              assetUri: narrationAudioAsset.assetUri,
              publicSourceUrl: narrationAudioAsset.publicUrl,
              providerAssetId: narrationAudioAsset.providerAssetId,
              language: narrationAudio.language,
              languageBoost: narrationAudio.languageBoost,
            },
          },
          aspectRatio: "9:16",
          videoResolution: VIDEO_GENERATION_RESOLUTION,
          duration: seedanceDurationSeconds,
          generateAudio: true,
          audioHandling:
            "MiniMax audio is sent to Seedance as reference_audio and should be used during generation.",
        },
        responseJson: arkTask.raw,
      });

      return {
        taskId,
        scriptDraftId,
        moduleCode: "video-generation",
        status: "queued",
        progress: 5,
        kieTaskId: arkTask.taskId,
        model: env.ark.videoModel,
        durationSeconds: seedanceDurationSeconds,
        templateId: draft.referenceMaterialId,
        templateType,
        language,
        outputRatio: "9:16",
        videoResolution: VIDEO_GENERATION_RESOLUTION,
        generateAudio: true,
        narrationAudio: {
          provider: "minimax",
          model: narrationAudio.model,
          voiceId: narrationAudio.voiceId,
          usage: "seedance_reference_audio_for_generation",
          scriptText: narrationScriptText,
          fitAttempts: fittedNarration.attempts,
          durationMs: narrationAudio.durationMs,
          originalDurationMs: narrationAudio.originalDurationMs,
          normalizedSpeechDurationMs: narrationAudio.normalizedSpeechDurationMs,
          silencePadMs: narrationAudio.silencePadMs,
          timeStretchRatio: narrationAudio.timeStretchRatio,
          speed: narrationAudio.speed,
          language: narrationAudio.language,
          url: narrationAudio.publicUrl,
        },
        inputReferenceCount: inputAssetUris.length,
        mediaSummary: {
          digitalHumanCount: 1,
          narrationAudioCount: 1,
          styleVideoCount: 0,
          stylePromptApplied: true,
          exteriorImageCount: exteriorAssets.length,
          interiorImageCount: interiorAssets.length,
          dealershipImageCount: dealershipAssets.length,
          userReferenceImageCount: userReferenceAssets.length,
        },
        ...toBillingResponseFields(billing),
        pollingUrl: `/api/v1/modules/video-generation/tasks/${taskId}`,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      if (billing) {
        try {
          await refundFrozenGenerationBilling(taskId, billing);
        } catch {
          await markGenerationBillingRefundFailed(taskId, billing);
        }
      }
      if (taskCreated && !billingFreezeFailed) {
        await tasksRepository.markFailed(
          taskId,
          "VIDEO_GENERATION_CREATE_FAILED",
          buildVideoTaskErrorMessage(error),
        );
      }
      throw error;
    }
  }

  async listVideoTasks(
    input: { status?: unknown; page?: unknown; pageSize?: unknown },
    userId: string,
  ) {
    return tasksService.listRecentTasks({
      userId,
      moduleCode: "video-generation",
      status:
        typeof input.status === "string" && input.status.trim()
          ? input.status.trim()
          : undefined,
      page: Number(input.page ?? 1),
      pageSize: Number(input.pageSize ?? 20),
    });
  }

  async getVideoTask(taskId: string, userId: string) {
    const task = await tasksService.getTaskDetail(taskId, { userId });
    if (task.moduleCode !== "video-generation") {
      throw errors.taskNotFound();
    }
    const taskRecord = await tasksRepository.findById(taskId, userId);
    if (!taskRecord) throw errors.taskNotFound();
    const draft = taskRecord.optionId
      ? await videoScriptDraftRepository.findById(taskRecord.optionId, userId)
      : null;
    const requiredInputs = asRecord(draft?.requiredInputs);
    const vehicle = asRecord(requiredInputs.vehicle);
    const template = asRecord(requiredInputs.template);
    const records = await tasksRepository.listKieTaskRecords(taskId);
    const request = asRecord(
      records.find((record) => record.role === "primary")?.requestJson,
    );
    const narrationAudio = asRecord(
      asRecord(request.mediaInputs).narrationAudio,
    );
    return {
      ...task,
      templateId: draft?.referenceMaterialId ?? null,
      templateType:
        typeof template.type === "string"
          ? template.type
          : draft
            ? getVideoTemplateDefinition(draft.referenceMaterialId)?.type ??
              null
            : null,
      vehicleName: draft?.vehicleName ?? null,
      language:
        typeof vehicle.language === "string" ? vehicle.language : "Chinese",
      narrationAudio:
        Object.keys(narrationAudio).length > 0
          ? {
              provider: "minimax",
              model: narrationAudio.model ?? null,
              voiceId: narrationAudio.voiceId ?? null,
              durationMs: narrationAudio.durationMs ?? null,
              originalDurationMs: narrationAudio.originalDurationMs ?? null,
              normalizedSpeechDurationMs:
                narrationAudio.normalizedSpeechDurationMs ?? null,
              silencePadMs: narrationAudio.silencePadMs ?? null,
              timeStretchRatio: narrationAudio.timeStretchRatio ?? null,
              speed: narrationAudio.speed ?? null,
              language: narrationAudio.language ?? null,
              url: narrationAudio.localUrl ?? null,
              originalUrl: narrationAudio.originalLocalUrl ?? null,
            }
          : null,
    };
  }

  async cancelVideoTask(taskId: string, userId: string) {
    return tasksService.cancelTask(taskId, userId, {
      moduleCode: "video-generation",
    });
  }

  async regenerateVideoTask(
    taskId: string,
    userId: string,
    context?: BillingRequestContext,
  ) {
    const sourceTask = await tasksRepository.findById(taskId, userId);
    if (!sourceTask || sourceTask.moduleCode !== "video-generation") {
      throw errors.taskNotFound();
    }
    if (!["success", "fail", "canceled"].includes(sourceTask.status)) {
      throw errors.conflict(
        "only a completed, failed, or canceled video task can be regenerated",
        {
          taskId,
          status: sourceTask.status,
        },
      );
    }
    if (!sourceTask.optionId) {
      throw errors.invalidParameter(
        "source video task is missing scriptDraftId",
        { taskId },
      );
    }
    const created = await this.createVideoTask(
      { scriptDraftId: sourceTask.optionId },
      userId,
      context,
    );
    return {
      ...created,
      regeneratedFromTaskId: taskId,
    };
  }
}

export const videoGenerationService = new VideoGenerationService();
