import path from "node:path";

import dotenv from "dotenv";

const rootDir = path.resolve(__dirname, "../..");

dotenv.config({ path: path.resolve(rootDir, ".env") });
dotenv.config();

const toNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toList = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const toBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

const toOptionalNumber = (value: string | undefined) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toNumber(process.env.PORT, 3001),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:3001",
  rootDir,
  uploadDir: path.resolve(rootDir, process.env.UPLOAD_DIR ?? "storage/uploads"),
  resultsDir: path.resolve(rootDir, process.env.RESULTS_DIR ?? "storage/results"),
  packagesDir: path.resolve(rootDir, process.env.PACKAGES_DIR ?? "storage/packages"),
  sceneRefsDir: path.resolve(rootDir, process.env.SCENE_REFS_DIR ?? "storage/scene-refs"),
  maxUploadMb: toNumber(process.env.MAX_UPLOAD_MB, 20),
  ffmpegPath: process.env.FFMPEG_PATH ?? "ffmpeg",
  showApiVin: {
    baseUrl: process.env.SHOWAPI_VIN_API_URL ?? "https://route.showapi.com/1142-2",
    appKey: process.env.SHOWAPI_VIN_APP_KEY ?? "",
    timeoutMs: toNumber(process.env.SHOWAPI_VIN_TIMEOUT_MS, 12_000),
  },
  jisuVin: {
    baseUrl: process.env.JISU_VIN_API_URL ?? "https://api.jisuapi.com/vin/query",
    appKey: process.env.JISU_VIN_APP_KEY ?? "",
    timeoutMs: toNumber(process.env.JISU_VIN_TIMEOUT_MS, 12_000),
  },

  mysql: {
    host: process.env.MYSQL_HOST ?? "127.0.0.1",
    port: toNumber(process.env.MYSQL_PORT, 3306),
    database: process.env.MYSQL_DATABASE ?? "used_car_platform",
    user: process.env.MYSQL_USER ?? "root",
    password: process.env.MYSQL_PASSWORD ?? "",
    connectionLimit: toNumber(process.env.MYSQL_CONNECTION_LIMIT, 10),
  },

  kie: {
    apiKeys: toList(process.env.KIE_API_KEYS),
    balanceStrategy: process.env.KIE_BALANCE_STRATEGY ?? "round_robin",
    maxConcurrentPerKey: toNumber(process.env.KIE_MAX_CONCURRENT_PER_KEY, 100),
    maxUploadConcurrent: toNumber(process.env.KIE_MAX_UPLOAD_CONCURRENT, 5),
    acquireWaitTimeoutMs: toNumber(process.env.KIE_ACQUIRE_WAIT_TIMEOUT_MS, 15_000),
    acquireRetryIntervalMs: toNumber(process.env.KIE_ACQUIRE_RETRY_INTERVAL_MS, 500),
    createTaskUrl:
      process.env.KIE_CREATE_TASK_URL ?? "https://api.kie.ai/api/v1/jobs/createTask",
    taskDetailUrl:
      process.env.KIE_TASK_DETAIL_URL ?? "https://api.kie.ai/api/v1/jobs/recordInfo",
    fileUploadBaseUrl: process.env.KIE_FILE_UPLOAD_BASE_URL ?? "https://kieai.redpandaai.co",
    model: process.env.KIE_PRIMARY_IMAGE_MODEL ?? "gpt-image-2-image-to-image",
    primaryImageModel: process.env.KIE_PRIMARY_IMAGE_MODEL ?? "gpt-image-2-image-to-image",
    fallbackImageModel: process.env.KIE_FALLBACK_IMAGE_MODEL ?? "nano-banana-2",
    fallbackOutputFormat: process.env.KIE_FALLBACK_OUTPUT_FORMAT ?? "jpg",
    fallbackEnabled: toBoolean(process.env.KIE_FALLBACK_ENABLED, true),
    uploadTimeoutMs: toNumber(process.env.KIE_UPLOAD_TIMEOUT_MS, 30_000),
    createTimeoutMs: toNumber(process.env.KIE_CREATE_TIMEOUT_MS, 20_000),
    detailTimeoutMs: toNumber(process.env.KIE_DETAIL_TIMEOUT_MS, 10_000),
    downloadTimeoutMs: toNumber(process.env.KIE_DOWNLOAD_TIMEOUT_MS, 60_000),
    networkRetryLimit: toNumber(process.env.KIE_NETWORK_RETRY_LIMIT, 2),
    networkRetryBaseMs: toNumber(process.env.KIE_NETWORK_RETRY_BASE_MS, 1_000),
    networkRetryMaxMs: toNumber(process.env.KIE_NETWORK_RETRY_MAX_MS, 4_000),
    imageDeadlineMs: toNumber(process.env.KIE_IMAGE_DEADLINE_MS, 480_000),
    imageSoftTimeoutMs: toNumber(process.env.KIE_IMAGE_SOFT_TIMEOUT_MS, 180_000),
    videoDeadlineMs: toNumber(process.env.KIE_VIDEO_DEADLINE_MS, 1_200_000),
    pollFailureLimit: toNumber(process.env.KIE_POLL_FAILURE_LIMIT, 3),
  },

  ark: {
    apiKey: process.env.ARK_API_KEY ?? "",
    baseUrl: (process.env.ARK_API_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, ""),
    videoModel: process.env.ARK_VIDEO_MODEL ?? "doubao-seedance-2-0-260128",
    projectName: process.env.ARK_PROJECT_NAME ?? "",
    accessKeyId: process.env.VOLC_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.VOLC_SECRET_ACCESS_KEY ?? "",
    region: process.env.VOLC_REGION ?? "cn-beijing",
    openApiEndpoint: (process.env.VOLC_OPENAPI_ENDPOINT ?? "https://open.volcengineapi.com").replace(/\/$/, ""),
    virtualAssetGroupName: process.env.ARK_VIRTUAL_ASSET_GROUP_NAME ?? "used-car-platform-virtual-assets",
    virtualAssetPollIntervalMs: toNumber(process.env.ARK_VIRTUAL_ASSET_POLL_INTERVAL_MS, 10_000),
    virtualAssetPollAttempts: toNumber(process.env.ARK_VIRTUAL_ASSET_POLL_ATTEMPTS, 18),
    createTimeoutMs: toNumber(process.env.ARK_CREATE_TIMEOUT_MS, 30_000),
    detailTimeoutMs: toNumber(process.env.ARK_DETAIL_TIMEOUT_MS, 10_000),
  },

  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    baseUrl: (process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, ""),
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro",
    timeoutMs: toNumber(process.env.DEEPSEEK_TIMEOUT_MS, 30_000),
    maxTokens: toNumber(process.env.DEEPSEEK_MAX_TOKENS, 2000),
  },

  minimax: {
    apiKey: process.env.MINIMAX_API_KEY ?? "",
    baseUrl: (process.env.MINIMAX_BASE_URL ?? "https://api.minimaxi.com").replace(/\/$/, ""),
    speechModel: process.env.MINIMAX_SPEECH_MODEL ?? "speech-2.8-hd",
    timeoutMs: toNumber(process.env.MINIMAX_TIMEOUT_MS, 60_000),
    maxCloneAudioMb: toNumber(process.env.MINIMAX_MAX_CLONE_AUDIO_MB, 20),
    targetAudioDurationMs: toNumber(process.env.MINIMAX_TARGET_AUDIO_DURATION_MS, 14_500),
  },

  credits: {
    enabled: toBoolean(process.env.CREDITS_PLATFORM_ENABLED, false),
    baseUrl: (process.env.CREDITS_PLATFORM_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, ""),
    applicationCode: process.env.CREDITS_APPLICATION_CODE ?? "used-car-platform",
    defaultUserId: toOptionalNumber(process.env.CREDITS_DEFAULT_USER_ID),
    defaultTenantId: toOptionalNumber(process.env.CREDITS_DEFAULT_TENANT_ID),
    defaultAccountScope:
      process.env.CREDITS_DEFAULT_ACCOUNT_SCOPE === "tenant" ? "tenant" : "personal",
    requestTimeoutMs: toNumber(process.env.CREDITS_REQUEST_TIMEOUT_MS, 8000),
    mysql: {
      host: process.env.CREDITS_MYSQL_HOST ?? "127.0.0.1",
      port: toNumber(process.env.CREDITS_MYSQL_PORT, 3310),
      database: process.env.CREDITS_MYSQL_DATABASE ?? "credits_platform",
      user: process.env.CREDITS_MYSQL_USER ?? "credits",
      password: process.env.CREDITS_MYSQL_PASSWORD ?? "credits",
      connectionLimit: toNumber(process.env.CREDITS_MYSQL_CONNECTION_LIMIT, 5),
    },
  },
  verification: {
    tencentSecretId: process.env.TENCENTCLOUD_SECRET_ID ?? "",
    tencentSecretKey: process.env.TENCENTCLOUD_SECRET_KEY ?? "",
    tencentRegion: process.env.TENCENTCLOUD_REGION ?? "ap-guangzhou",
    smsSdkAppId: process.env.SMS_SDK_APP_ID ?? "",
    smsSignName: process.env.SMS_SIGN_NAME ?? "",
    smsLoginTemplateId: process.env.SMS_LOGIN_TEMPLATE_ID ?? "",
    smsReviseTemplateId: process.env.SMS_REVISE_TEMPLATE_ID ?? "",
    smsTemplateParamMode: process.env.SMS_TEMPLATE_PARAM_MODE ?? "code_time",
    smsCodeExpireMinutes: toNumber(process.env.SMS_CODE_EXPIRE_MINUTES, 5),
    smsDryRun: toBoolean(process.env.SMS_DRY_RUN, false),
  },
};
