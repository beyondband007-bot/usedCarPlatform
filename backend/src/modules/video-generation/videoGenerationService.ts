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
  const duration = Number(value ?? 20);
  if ([15, 20, 30].includes(duration)) return duration as 15 | 20 | 30;
  throw errors.invalidParameter("durationSeconds must be 15, 20, or 30", { durationSeconds: value });
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
    "文案必须口语化、可信、销售导向，适合 15-30 秒竖屏短视频。",
    "视频类型、场景氛围、镜头节奏、灯光和表达方式必须跟随用户选择的参考素材。",
    "不得编造年份以外的新信息，不得编造公里数、价格、事故记录、过户次数、金融政策、官方配置和车况承诺。",
    "除非用户明确提供，否则禁止出现：几万块、价格实惠、车况精品、准新车、无事故、原版原漆、包过户、金融优惠、老铁、抓紧。",
    "口播可以有销售感，但必须保持专业克制，不使用夸张直播叫卖口吻。",
    "如果用户上传图片摘要提供了外观、内饰、颜色、座舱或细节信息，可以用于文案；没有提供的信息不要假设。",
    "输出 JSON 字段：openingHook, scriptText, sellingPoints, shotCues, riskNotes。",
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
    `视频时长：${input.durationSeconds} 秒`,
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

const buildScriptText = (input: {
  vehicleName: string;
  referenceMaterial: ReferenceMaterialRecord;
  sellingPointHints: string[];
  vehicleImageSummary?: string;
}) => {
  const points = input.sellingPointHints.length ? input.sellingPointHints : sellingPointFallbacks(input.vehicleName);
  const styleTags = input.referenceMaterial.styleJson.styleTags.slice(0, 3).join("、");
  const imageLine = input.vehicleImageSummary
    ? `结合上传图片来看，${input.vehicleImageSummary}，视频里会重点保留这些真实参考。`
    : "外观和内饰以你上传的参考图片为准，视频里会尽量锁定真实车身结构、颜色和座舱细节。";

  return [
    `如果你正在看${input.vehicleName}，这台车可以重点了解一下。`,
    `${points.slice(0, 3).join("、")}是这条视频需要突出的核心卖点。`,
    imageLine,
    `整体呈现会跟随「${input.referenceMaterial.title}」的${styleTags}风格，数字人在画面里自然讲解，镜头穿插车辆外观、内饰和细节参考。`,
    "如果你想找一台适合日常使用、又能直观看清真实状态的车，建议到店或联系顾问进一步确认车况。"
  ].join("");
};

const mergeGeneratedDraft = (fallback: {
  scriptText: string;
  openingHook: string;
  sellingPoints: string[];
  shotCues: ReturnType<typeof buildShotCues>;
  riskNotes: string[];
}, generated: Awaited<ReturnType<typeof deepSeekClient.createScriptDraft>>) => {
  if (!generated) return fallback;
  return {
    scriptText: generated.scriptText || fallback.scriptText,
    openingHook: generated.openingHook || fallback.openingHook,
    sellingPoints: generated.sellingPoints.length ? generated.sellingPoints : fallback.sellingPoints,
    shotCues: generated.shotCues.length ? generated.shotCues : fallback.shotCues,
    riskNotes: generated.riskNotes.length ? generated.riskNotes : fallback.riskNotes,
  };
};

const buildShotCues = (input: {
  durationSeconds: number;
  vehicleName: string;
  referenceMaterial: ReferenceMaterialRecord;
  scriptText: string;
}) => {
  const middle = input.durationSeconds === 15 ? ["4-9s", "9-13s", "13-15s"] : input.durationSeconds === 20 ? ["4-10s", "10-16s", "16-20s"] : ["5-14s", "14-24s", "24-30s"];
  return [
    {
      timeRange: input.durationSeconds === 30 ? "0-5s" : "0-4s",
      visual: `数字人出场，画面采用${input.referenceMaterial.title}的场景和镜头节奏，车辆外观参考图入画。`,
      voiceover: `如果你正在看${input.vehicleName}，这台车可以重点了解一下。`,
      assetRole: "digital_human|reference_style|exterior",
    },
    {
      timeRange: middle[0],
      visual: "展示车辆外观参考图对应的前45度、侧身、灯组、轮毂或车身线条。",
      voiceover: "突出车型外观、真实车身状态和用户补充卖点。",
      assetRole: "exterior|reference_style",
    },
    {
      timeRange: middle[1],
      visual: "如用户上传内饰图，切入方向盘、中控、座椅和空间；否则继续展示外观细节。",
      voiceover: "讲解空间、舒适性、配置或适合人群，避免编造未提供信息。",
      assetRole: "interior|exterior|reference_style",
    },
    {
      timeRange: middle[2],
      visual: "数字人回到车旁收束，保持参考素材的视频类型和节奏。",
      voiceover: "引导用户到店实看或联系顾问确认车况。",
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
      durationSeconds,
      vehicleName,
      referenceMaterial,
      scriptText: fallbackScriptText,
    });
    const assetSummary = [
      `外观图 ${uploadedAssets.vehicleExteriorAssets.length} 张：${uploadedAssets.vehicleExteriorAssets.map((asset) => asset.fileName).join("、")}`,
      `内饰图 ${uploadedAssets.vehicleInteriorAssets.length} 张：${uploadedAssets.vehicleInteriorAssets.map((asset) => asset.fileName).join("、") || "无"}`,
      `额外参考图 ${uploadedAssets.userReferenceAssets.length} 张：${uploadedAssets.userReferenceAssets.map((asset) => asset.fileName).join("、") || "无"}`,
    ].join("\n");
    const deepSeekDraft = await deepSeekClient.createScriptDraft({
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
    const generatedDraft = mergeGeneratedDraft({
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
        openingHook: generatedDraft.openingHook,
        scriptPrompt,
        scriptText,
        sellingPoints: generatedDraft.sellingPoints,
        shotCues,
        generator: deepSeekDraft ? "deepseek" : "local_fallback",
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
        `口播文案：${scriptText}`,
        promptBundle.uploadedReferencePrompt,
        "视频生成时必须同时引用数字人、参考视频风格、口播文案、用户上传车辆参考素材。",
      ].join("\n\n"),
      riskNotes: [
        ...generatedDraft.riskNotes,
        deepSeekDraft ? "口播文案由 DeepSeek 生成。" : "当前未配置 DeepSeek API key，口播文案由后端本地草稿生成器生成。",
      ],
    };
  }
}

export const videoGenerationService = new VideoGenerationService();
