import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const splitAt = trimmed.indexOf("=");
    const key = trimmed.slice(0, splitAt).trim();
    let value = trimmed.slice(splitAt + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(backendDir, ".env"));

const runId = `phase11_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}_${randomUUID().slice(0, 8)}`;
const applicationCode = process.env.CREDITS_APPLICATION_CODE || "used-car-platform";
const userId = Number(process.env.PHASE11_CREDITS_USER_ID || process.env.CREDITS_DEFAULT_USER_ID || 4);
const tenantId = Number(process.env.PHASE11_CREDITS_TENANT_ID || process.env.CREDITS_DEFAULT_TENANT_ID || 4);
const accountScope = process.env.PHASE11_ACCOUNT_SCOPE === "tenant" ? "tenant" : "personal";
const creditsBaseUrl = (process.env.CREDITS_PLATFORM_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const usedCarBaseUrl = (
  process.env.PHASE11_USEDCAR_BASE_URL ||
  `http://127.0.0.1:${process.env.PORT || 3101}`
).replace(/\/$/, "");

const identityHeaders = {
  "content-type": "application/json",
  "x-credits-user-id": String(userId),
  "x-credits-account-scope": accountScope,
  ...(accountScope === "tenant" ? { "x-credits-tenant-id": String(tenantId) } : {}),
};

const checks = [];

function pass(name, details = "") {
  checks.push({ name, details });
  console.log(`ok - ${name}${details ? ` (${details})` : ""}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson(baseUrl, pathName, options = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = body?.message || body?.error || text || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function expectHttpError(baseUrl, pathName, options = {}) {
  try {
    await requestJson(baseUrl, pathName, options);
  } catch (error) {
    if (error.status) return error;
    throw error;
  }
  throw new Error(`Expected ${pathName} to fail`);
}

async function usedCar(pathName, options = {}) {
  return requestJson(usedCarBaseUrl, pathName, options);
}

async function credits(pathName, options = {}) {
  return requestJson(creditsBaseUrl, pathName, options);
}

async function createMysqlPool() {
  return mysql.createPool({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE || "used_car_platform",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    waitForConnections: true,
    connectionLimit: 4,
  });
}

async function freezeBilling({ functionCode, bizType, bizId }) {
  const estimate = await credits("/billing/estimate", {
    method: "POST",
    body: JSON.stringify({
      userId,
      accountScope,
      tenantId: accountScope === "tenant" ? tenantId : undefined,
      applicationCode,
      functionCode,
      bizType,
      bizId,
      idempotencyKey: `estimate:${bizType}:${bizId}`,
    }),
  });

  const frozen = await credits("/billing/freeze", {
    method: "POST",
    body: JSON.stringify({
      userId,
      billingTaskId: estimate.billingTaskId,
      idempotencyKey: `freeze:${bizType}:${bizId}`,
    }),
  });

  assert(frozen.status === "frozen", `${bizId} did not freeze`);
  return frozen;
}

async function insertGenerationTask(pool, input) {
  await pool.execute(
    `INSERT INTO generation_tasks (
      id, module_code, status, progress, input_asset_id, option_id, output_ratio, resolution,
      prompt, result_json, error_code, error_message, credits_user_id, credits_tenant_id,
      account_scope, billing_task_id, billing_status, estimated_points, settled_points
    ) VALUES (?, ?, ?, 100, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'frozen', ?, ?)`,
    [
      input.taskId,
      input.moduleCode,
      input.status,
      input.inputAssetId ?? null,
      input.optionId ?? "phase11",
      input.outputRatio ?? "16:9",
      input.resolution ?? "2K",
      input.prompt ?? "phase 11 e2e smoke task",
      input.status === "success" ? JSON.stringify([{ url: `https://example.test/${input.taskId}.png` }]) : null,
      input.status === "fail" ? "PHASE11_SIMULATED_FAILURE" : null,
      input.status === "fail" ? "phase 11 simulated generation failure" : null,
      userId,
      accountScope === "tenant" ? tenantId : null,
      accountScope,
      input.billing.billingTaskId,
      input.billing.estimatedPoints,
      input.billing.settledPoints,
    ],
  );
}

async function registerFunction(functionConfig) {
  return credits(`/integration/applications/${encodeURIComponent(applicationCode)}/functions`, {
    method: "POST",
    body: JSON.stringify({
      code: functionConfig.code,
      name: functionConfig.name,
      description: functionConfig.description,
      chargeMode: functionConfig.chargeMode,
      defaultPoints: functionConfig.defaultPoints,
      status: functionConfig.status,
    }),
  });
}

async function verifyProxyApis() {
  const accounts = await usedCar("/api/v1/credits/accounts", { headers: identityHeaders });
  assert(Array.isArray(accounts.data?.accounts) && accounts.data.accounts.length > 0, "no accounts from proxy");
  pass("proxy accounts", `${accounts.data.accounts.length} account(s)`);

  const products = await usedCar("/api/v1/credits/recharge-products", { headers: identityHeaders });
  assert(Array.isArray(products.data?.products) && products.data.products.length > 0, "no recharge products");
  pass("proxy recharge products", `${products.data.products.length} product(s)`);

  const firstProduct = products.data.products[0];
  const order = await usedCar("/api/v1/credits/payment-orders", {
    method: "POST",
    headers: identityHeaders,
    body: JSON.stringify({
      productId: firstProduct.id,
      payChannel: "card",
      idempotencyKey: `phase11:payment:${runId}`,
    }),
  });
  assert(order.data?.status === "pending", "payment order was not pending");
  pass("payment order creation", `order ${order.data.paymentOrderId}`);

  const overview = await usedCar("/api/v1/credits/admin/overview", { headers: identityHeaders });
  assert(Array.isArray(overview.data?.functions) && overview.data.functions.length > 0, "admin overview has no functions");
  pass("admin overview", `${overview.data.functions.length} function(s)`);
}

async function verifySingleTaskFinalization(pool) {
  const successTaskId = `task_${runId}_single_success`;
  const successBilling = await freezeBilling({
    functionCode: "showroom-light",
    bizType: "generation_task",
    bizId: successTaskId,
  });
  await insertGenerationTask(pool, {
    taskId: successTaskId,
    moduleCode: "showroom-light",
    status: "success",
    billing: successBilling,
  });
  const successDetail = await usedCar(`/api/v1/tasks/${successTaskId}`);
  assert(successDetail.data?.billingStatus === "settled", "success task did not settle");
  pass("single success settles", `task ${successTaskId}`);

  const failTaskId = `task_${runId}_single_fail`;
  const failBilling = await freezeBilling({
    functionCode: "showroom-light",
    bizType: "generation_task",
    bizId: failTaskId,
  });
  await insertGenerationTask(pool, {
    taskId: failTaskId,
    moduleCode: "showroom-light",
    status: "fail",
    billing: failBilling,
  });
  const failDetail = await usedCar(`/api/v1/tasks/${failTaskId}`);
  assert(failDetail.data?.billingStatus === "refunded", "failed task did not refund");
  pass("single failure refunds", `task ${failTaskId}`);
}

async function verifyBatchFinalization(pool) {
  const batchId = `batch_${runId}`;
  const successItemId = `batch_item_${runId}_success`;
  const failItemId = `batch_item_${runId}_fail`;
  const successTaskId = `task_${runId}_batch_success`;
  const failTaskId = `task_${runId}_batch_fail`;

  const successBilling = await freezeBilling({
    functionCode: "batch-new-exterior",
    bizType: "batch_item",
    bizId: successItemId,
  });
  const failBilling = await freezeBilling({
    functionCode: "batch-new-interior",
    bizType: "batch_item",
    bizId: failItemId,
  });

  await pool.execute(
    `INSERT INTO batch_tasks (
      id, project_name, preset_id, status, total, completed, failed, progress,
      visual_config_json, credits_user_id, credits_tenant_id, account_scope
    ) VALUES (?, ?, 'phase11-preset', 'waiting', 2, 0, 0, 0, ?, ?, ?, ?)`,
    [
      batchId,
      `Phase 11 E2E ${runId}`,
      JSON.stringify({ outputRatio: "1:1", enableSceneChange: false }),
      userId,
      accountScope === "tenant" ? tenantId : null,
      accountScope,
    ],
  );

  await insertGenerationTask(pool, {
    taskId: successTaskId,
    moduleCode: "batch-new",
    status: "success",
    optionId: "exterior",
    outputRatio: "1:1",
    billing: successBilling,
  });
  await insertGenerationTask(pool, {
    taskId: failTaskId,
    moduleCode: "batch-new",
    status: "fail",
    optionId: "interior",
    outputRatio: "1:1",
    billing: failBilling,
  });

  await pool.execute(
    `INSERT INTO batch_task_items (
      id, batch_id, group_title, item_kind, input_asset_id, generation_task_id, sort_order
    ) VALUES
      (?, ?, 'Phase 11', 'exterior', 'phase11_asset_exterior', ?, 0),
      (?, ?, 'Phase 11', 'interior', 'phase11_asset_interior', ?, 1)`,
    [successItemId, batchId, successTaskId, failItemId, batchId, failTaskId],
  );

  const detail = await usedCar(`/api/v1/modules/batch-new/tasks/${batchId}`);
  assert(detail.data?.status === "fail", "mixed batch should finish as fail");
  assert(detail.data?.completed === 1 && detail.data?.failed === 1, "mixed batch counts are wrong");

  const [rows] = await pool.execute(
    `SELECT id, billing_status FROM generation_tasks WHERE id IN (?, ?) ORDER BY id ASC`,
    [successTaskId, failTaskId],
  );
  const statuses = new Map(rows.map((row) => [row.id, row.billing_status]));
  assert(statuses.get(successTaskId) === "settled", "batch success item did not settle");
  assert(statuses.get(failTaskId) === "refunded", "batch failed item did not refund");
  pass("batch mixed settle/refund", `batch ${batchId}`);
}

async function verifyInsufficientBalance(pool) {
  const functions = await credits(`/integration/applications/${encodeURIComponent(applicationCode)}/functions`);
  const showroom = functions.functions.find((item) => item.code === "showroom-light");
  assert(showroom, "showroom-light function missing");

  const originalPoints = showroom.defaultPoints;
  const assetId = `asset_${runId}_insufficient`;

  await pool.execute(
    `INSERT INTO assets (
      id, purpose, file_name, mime_type, size, local_path, public_url
    ) VALUES (?, 'car_exterior', 'phase11-insufficient.jpg', 'image/jpeg', 1, ?, ?)`,
    [assetId, path.join(backendDir, "storage", "uploads", `${assetId}.jpg`), `/uploads/${assetId}.jpg`],
  );

  try {
    await registerFunction({
      ...showroom,
      defaultPoints: "999999999.0000",
    });
    const error = await expectHttpError(usedCarBaseUrl, "/api/v1/modules/showroom-light/tasks", {
      method: "POST",
      headers: identityHeaders,
      body: JSON.stringify({
        inputAssetId: assetId,
        optionId: "white-studio",
      }),
    });
    assert(error.status === 402, `expected insufficient balance HTTP 402, got ${error.status}`);

    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS submitted
       FROM generation_tasks
       WHERE input_asset_id = ? AND kie_task_id IS NOT NULL`,
      [assetId],
    );
    assert(Number(rows[0]?.submitted ?? 0) === 0, "insufficient balance task was submitted to KIE");
    pass("insufficient balance blocks KIE submission");
  } finally {
    await registerFunction({
      ...showroom,
      defaultPoints: originalPoints,
    });
  }
}

async function main() {
  assert(Number.isInteger(userId) && userId > 0, "PHASE11_CREDITS_USER_ID/CREDITS_DEFAULT_USER_ID is invalid");
  if (accountScope === "tenant") {
    assert(Number.isInteger(tenantId) && tenantId > 0, "tenant account scope requires a tenant id");
  }

  await credits("/health");
  pass("credits health", creditsBaseUrl);
  await usedCar("/health");
  pass("usedCar health", usedCarBaseUrl);

  const pool = await createMysqlPool();
  try {
    await verifyProxyApis();
    await verifySingleTaskFinalization(pool);
    await verifyBatchFinalization(pool);
    await verifyInsufficientBalance(pool);
  } finally {
    await pool.end();
  }

  console.log("");
  console.log(`Phase 11 smoke passed: ${checks.length} checks, runId=${runId}`);
}

main().catch((error) => {
  console.error("");
  console.error("Phase 11 smoke failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
