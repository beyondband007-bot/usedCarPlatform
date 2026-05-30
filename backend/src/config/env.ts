import path from "node:path";

import dotenv from "dotenv";

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

const rootDir = path.resolve(__dirname, "../..");

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toNumber(process.env.PORT, 3001),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:3001",
  rootDir,
  uploadDir: path.resolve(rootDir, process.env.UPLOAD_DIR ?? "storage/uploads"),
  resultsDir: path.resolve(rootDir, process.env.RESULTS_DIR ?? "storage/results"),
  packagesDir: path.resolve(rootDir, process.env.PACKAGES_DIR ?? "storage/packages"),
  maxUploadMb: toNumber(process.env.MAX_UPLOAD_MB, 20),

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
    maxConcurrentPerKey: toNumber(process.env.KIE_MAX_CONCURRENT_PER_KEY, 2),
    createTaskUrl:
      process.env.KIE_CREATE_TASK_URL ?? "https://api.kie.ai/api/v1/jobs/createTask",
    taskDetailUrl:
      process.env.KIE_TASK_DETAIL_URL ?? "https://api.kie.ai/api/v1/jobs/recordInfo",
    fileUploadBaseUrl: process.env.KIE_FILE_UPLOAD_BASE_URL ?? "https://kieai.redpandaai.co",
    model: "gpt-image-2-image-to-image",
  },
};
