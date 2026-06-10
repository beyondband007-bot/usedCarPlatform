import fs from "node:fs/promises";
import path from "node:path";

import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import type { AssetPurpose } from "../../shared/types";
import { deepSeekClient } from "../../providers/deepseek/deepseekClient";
import { assetsRepository, type AssetRecord } from "../assets/assetsRepository";

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
  extractionStatus: "pending" | "completed";
}

interface ReferenceMaterialManifest {
  manifestVersion: number;
  materials: ReferenceMaterialRecord[];
}

interface CreateScriptDraftInput {
  vehicleName?: unknown;
  digitalHumanId?: unknown;
  referenceMaterialId?: unknown;
  vehicleExteriorAssetIds?: unknown;
  vehicleInteriorAssetIds?: unknown;
  userReferenceAssetIds?: unknown;
  durationSeconds?: unknown;
  sellingPointHints?: unknown;
  vehicleImageSummary?: unknown;
}

interface ValidatedAssets {
  vehicleExteriorAssets: AssetRecord[];
  vehicleInteriorAssets: AssetRecord[];
  userReferenceAssets: AssetRecord[];
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

const workspaceRoot = path.resolve(__dirname, "../../../..");
const digitalHumanRoot = path.join(workspaceRoot, "digital human");
const digitalHumanManifestPath = path.join(digitalHumanRoot, "digital-humans.json");
const referenceManifestPath = path.join(digitalHumanRoot, "reference-materials.json");

const asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];

const unique = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

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

const summarizeAsset = (asset: AssetRecord) => ({
  assetId: asset.id,
  purpose: asset.purpose,
  url: asset.publicUrl,
  thumbnailUrl: asset.thumbnailUrl,
  fileName: asset.fileName,
  width: asset.width,
  height: asset.height,
});

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
}) => {
  const style = input.referenceMaterial.styleJson;
  return [
    "你是二手车短视频口播文案策划。请只输出 JSON。",
    `车型名称：${input.vehicleName}`,
    `视频时长：${input.durationSeconds} 秒`,
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
    `可复用风格 Prompt：${input.referenceMaterial.stylePrompt}`,
    "要求：文案必须适合数字人口播；视频风格、类型、镜头节奏必须跟随参考素材；不得编造年份、里程、事故、价格、金融政策。",
  ].join("\n");
};

const buildDeepSeekSystemPrompt = () =>
  [
    "你是二手车短视频口播文案策划，负责根据车型名称、用户上传图片摘要和参考视频风格生成中文数字人口播文案。",
    "只输出 JSON，不输出 Markdown，不输出解释。",
    "视频时长固定为 15 秒。scriptText 控制在约 60-90 个中文字符，确保正常语速可以完整口播。",
    "不能只复述用户输入的车名。先识别品牌、车型、年款、车型级别、市场定位、目标人群和使用场景，再提炼适合 15 秒口播的车型级通用卖点。",
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
}) => {
  const style = input.referenceMaterial.styleJson;
  return [
    `车型名称：${input.vehicleName}`,
    `视频时长：固定 ${input.durationSeconds} 秒，不得延长或缩短`,
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
    `可复用风格 Prompt：${input.referenceMaterial.stylePrompt}`,
    "",
    "生成要求：",
    "1. 先在 vehicleProfile 中给出车型级理解，不能只复述车名。",
    "2. scriptText 必须自然包含车型定位、目标人群或使用场景，并至少讲出 2 个稳妥的车型卖点。",
    "3. 未提供具体配置版本时，不得写死动力形式、排量、辅助驾驶、屏幕尺寸、座椅功能等配置。",
    "4. 用户上传图片是车辆外观和内饰的事实依据；参考视频只决定风格、类型、场景和镜头节奏。",
    "5. 这是二手车视频：禁止使用“全新”“新车”；输入未写明代际时，禁止补充第几代车型。",
    "6. 避免“公认标杆、同级领先、就是答案、省心耐用、座椅柔软、用料考究”等无法仅凭车名确认的主观结论，优先讲车型定位、空间取向、舒适取向和使用场景。",
  ].join("\n");
};

const inferVehicleCategory = (vehicleName: string) => {
  if (/猛禽|F-?150|皮卡|坦途|炮/.test(vehicleName)) return "hardcore_pickup";
  if (/MPV|GL8|奥德赛|赛那|腾势D9|梦想家/.test(vehicleName)) return "mpv";
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

const buildScriptText = (input: {
  vehicleName: string;
  referenceMaterial: ReferenceMaterialRecord;
  sellingPointHints: string[];
  vehicleImageSummary?: string;
}) => {
  const profile = inferVehicleProfile(input.vehicleName);
  const points = input.sellingPointHints.length ? input.sellingPointHints : profile.recognizedHighlights;
  return `${input.vehicleName}，是一台${profile.marketPositioning}。${points.slice(0, 2).join("、")}，适合重视舒适与实用性的用户。具体配置和车况，以实车图片和检测为准。`;
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
}) => {
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

class VideoGenerationService {
  async listDigitalHumans() {
    const manifest = await readJson<DigitalHumanManifest>(digitalHumanManifestPath);
    return manifest.items
      .filter((item) => item.status === "active")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        id: item.id,
        name: item.name,
        gender: item.gender,
        ageStyle: item.ageStyle,
        previewUrl: toPublicDigitalHumanAssetUrl(item.id),
        imageUrl: toPublicDigitalHumanAssetUrl(item.id),
        frontPreviewStrategy: item.frontPreviewStrategy,
      }));
  }

  async getDigitalHuman(id: string) {
    const manifest = await readJson<DigitalHumanManifest>(digitalHumanManifestPath);
    const item = manifest.items.find((candidate) => candidate.id === id && candidate.status === "active");
    if (!item) {
      throw errors.invalidParameter("digitalHumanId is invalid", { digitalHumanId: id });
    }
    return item;
  }

  async getDigitalHumanImagePath(id: string) {
    const item = await this.getDigitalHuman(id);
    const imagePath = path.resolve(workspaceRoot, item.imagePath);
    if (!imagePath.startsWith(workspaceRoot)) {
      throw errors.invalidParameter("digital human image path is invalid", { id });
    }
    return imagePath;
  }

  async listReferenceMaterials() {
    const manifest = await readJson<ReferenceMaterialManifest>(referenceManifestPath);
    return manifest.materials
      .filter((material) => material.extractionStatus === "completed")
      .map((material) => ({
        id: material.id,
        title: material.title,
        videoType: material.videoType,
        referenceRole: material.referenceRole,
        previewUrl: toPublicReferencePreviewUrl(material.id),
        media: material.media,
        styleTags: material.styleJson.styleTags,
        stylePrompt: material.stylePrompt,
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
    return material;
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

  private async validateUploadedAssets(body: CreateScriptDraftInput, userId: string): Promise<ValidatedAssets> {
    const vehicleExteriorAssets = await this.validateAssetIds({
      userId,
      assetIds: asStringArray(body.vehicleExteriorAssetIds),
      role: "vehicleExteriorAssetIds",
      allowedPurposes: ["car_exterior"],
      minCount: 1,
      maxCount: 6,
    });

    const vehicleInteriorAssets = await this.validateAssetIds({
      userId,
      assetIds: asStringArray(body.vehicleInteriorAssetIds),
      role: "vehicleInteriorAssetIds",
      allowedPurposes: ["car_interior"],
      minCount: 0,
      maxCount: 6,
    });

    const userReferenceAssets = await this.validateAssetIds({
      userId,
      assetIds: asStringArray(body.userReferenceAssetIds),
      role: "userReferenceAssetIds",
      allowedPurposes: ["video_reference_image", "car_exterior", "car_interior"],
      minCount: 0,
      maxCount: 4,
    });

    return {
      vehicleExteriorAssets,
      vehicleInteriorAssets,
      userReferenceAssets,
    };
  }

  async createScriptDraft(body: CreateScriptDraftInput, userId: string) {
    const vehicleName = normalizeVehicleName(body.vehicleName);
    const digitalHumanId = typeof body.digitalHumanId === "string" ? body.digitalHumanId.trim() : "";
    const referenceMaterialId = typeof body.referenceMaterialId === "string" ? body.referenceMaterialId.trim() : "";
    if (!digitalHumanId) throw errors.invalidParameter("digitalHumanId is required");
    if (!referenceMaterialId) throw errors.invalidParameter("referenceMaterialId is required");

    const durationSeconds = normalizeDuration(body.durationSeconds);
    const sellingPointHints = normalizeSellingPointHints(body.sellingPointHints);
    const vehicleImageSummary =
      typeof body.vehicleImageSummary === "string" ? body.vehicleImageSummary.trim().slice(0, 500) : "";

    const [digitalHuman, referenceMaterial, uploadedAssets] = await Promise.all([
      this.getDigitalHuman(digitalHumanId),
      this.getReferenceMaterial(referenceMaterialId),
      this.validateUploadedAssets(body, userId),
    ]);

    const scriptPrompt = buildScriptPrompt({
      vehicleName,
      durationSeconds,
      referenceMaterial,
      sellingPointHints,
      vehicleImageSummary,
    });
    const fallbackScriptText = buildScriptText({
      vehicleName,
      referenceMaterial,
      sellingPointHints,
      vehicleImageSummary,
    });
    const fallbackShotCues = buildShotCues({
      vehicleName,
      referenceMaterial,
      scriptText: fallbackScriptText,
    });
    const fallbackVehicleProfile = inferVehicleProfile(vehicleName);
    const assetSummary = [
      `外观图 ${uploadedAssets.vehicleExteriorAssets.length} 张：${uploadedAssets.vehicleExteriorAssets.map((asset) => asset.fileName).join("、")}`,
      `内饰图 ${uploadedAssets.vehicleInteriorAssets.length} 张：${uploadedAssets.vehicleInteriorAssets.map((asset) => asset.fileName).join("、") || "无"}`,
      `额外参考图 ${uploadedAssets.userReferenceAssets.length} 张：${uploadedAssets.userReferenceAssets.map((asset) => asset.fileName).join("、") || "无"}`,
    ].join("\n");
    let deepSeekDraft: Awaited<ReturnType<typeof deepSeekClient.createScriptDraft>> = null;
    let deepSeekFailureNote = "";
    try {
      deepSeekDraft = await deepSeekClient.createScriptDraft({
        systemPrompt: buildDeepSeekSystemPrompt(),
        userPrompt: buildDeepSeekUserPrompt({
          vehicleName,
          durationSeconds,
          referenceMaterial,
          sellingPointHints,
          vehicleImageSummary,
          assetSummary,
        }),
      });
    } catch (error) {
      deepSeekFailureNote = error instanceof Error ? error.message : "unknown DeepSeek error";
    }
    const generatedDraft = mergeGeneratedDraft({
      vehicleName,
      vehicleProfile: fallbackVehicleProfile,
      scriptText: fallbackScriptText,
      openingHook: fallbackScriptText.split("。")[0] || fallbackScriptText,
      sellingPoints: sellingPointHints.length ? sellingPointHints : sellingPointFallbacks(vehicleName),
      shotCues: fallbackShotCues,
      riskNotes: [
        "车型名称未提供完整车况、里程和价格时，文案不会编造这些信息。",
      ],
    }, deepSeekDraft);
    const scriptText = generatedDraft.scriptText;
    const shotCues = generatedDraft.shotCues;

    const promptBundle = {
      digitalHumanPrompt: `使用数字人「${digitalHuman.name}」（${digitalHuman.gender}，${digitalHuman.ageStyle}）作为口播主体，参考其四视图与人物特写保持身份一致。`,
      stylePrompt: referenceMaterial.stylePrompt,
      scriptPrompt,
      uploadedReferencePrompt: [
        `外观参考图 ${uploadedAssets.vehicleExteriorAssets.length} 张：必须锁定车辆外观、颜色、车身结构、灯组、轮毂和真实车况。`,
        `内饰参考图 ${uploadedAssets.vehicleInteriorAssets.length} 张：如存在，必须用于座舱、空间、材质和配置展示。`,
        `用户额外参考图 ${uploadedAssets.userReferenceAssets.length} 张：只作为补充构图/场景/品牌参考，不覆盖参考视频风格。`,
      ].join("\n"),
    };

    const requiredInputs = {
      digitalHuman: {
        id: digitalHuman.id,
        name: digitalHuman.name,
        gender: digitalHuman.gender,
        imageUrl: toPublicDigitalHumanAssetUrl(digitalHuman.id),
      },
      referenceMaterial: {
        id: referenceMaterial.id,
        title: referenceMaterial.title,
        videoType: referenceMaterial.videoType,
        stylePrompt: referenceMaterial.stylePrompt,
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
      },
    };

    return {
      scriptDraftId: createId("video_script"),
      status: "ready_for_video_generation",
      vehicleName,
      durationSeconds,
      requiredInputs,
      promptBundle,
      finalVideoPrompt: [
        promptBundle.digitalHumanPrompt,
        promptBundle.stylePrompt,
        [
          "车型介绍重点：",
          `车型：${vehicleName}`,
          `车型级别：${generatedDraft.vehicleProfile.vehicleClass}`,
          `市场定位：${generatedDraft.vehicleProfile.marketPositioning}`,
          `目标人群：${generatedDraft.vehicleProfile.targetUsers.join("、")}`,
          `使用场景：${generatedDraft.vehicleProfile.useCases.join("、")}`,
          `核心卖点：${generatedDraft.vehicleProfile.recognizedHighlights.join("、")}`,
          `不可写死的信息：${generatedDraft.vehicleProfile.uncertainItems.join("、")}`,
        ].join("\n"),
        `口播文案：${scriptText}`,
        `固定时长：${VIDEO_DURATION_SECONDS} 秒；镜头时间轴必须为 ${FIXED_SHOT_TIME_RANGES.join("、")}。`,
        promptBundle.uploadedReferencePrompt,
        "视频生成时必须同时引用数字人、参考视频风格、口播文案、用户上传车辆参考素材。",
      ].join("\n\n"),
      riskNotes: [
        ...generatedDraft.riskNotes,
        deepSeekDraft
          ? "口播文案由 DeepSeek 生成。"
          : deepSeekFailureNote
            ? `DeepSeek 本次生成失败，后端已自动使用安全兜底文案：${deepSeekFailureNote}`
            : "当前未配置 DeepSeek API key，口播文案由后端本地草稿生成器生成。",
      ],
    };
  }
}

export const videoGenerationService = new VideoGenerationService();
