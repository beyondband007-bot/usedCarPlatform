import crypto from "node:crypto";
import dns from "node:dns";

import { env } from "../../config/env";
import { errors } from "../../shared/errors";

dns.setDefaultResultOrder("ipv4first");

type ArkOpenApiAction = "ListAssetGroups" | "CreateAssetGroup" | "CreateAsset" | "GetAsset";

export type ArkVirtualAssetType = "Image" | "Video" | "Audio";

export interface ArkAssetGroup {
  providerGroupId: string;
  name?: string;
  status?: string;
  raw: unknown;
}

export interface ArkVirtualAsset {
  providerAssetId: string;
  assetUri: string;
  status?: string;
  errorMessage?: string;
  raw: unknown;
}

const API_VERSION = "2024-01-01";
const SERVICE = "ark";
const SIGNED_HEADERS = "content-type;host;x-content-sha256;x-date";

const asRecord = (value: unknown): Record<string, any> =>
  value && typeof value === "object" ? (value as Record<string, any>) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const sha256Hex = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

const hmac = (key: crypto.BinaryLike | crypto.KeyObject, value: string) =>
  crypto.createHmac("sha256", key).update(value).digest();

const hmacHex = (key: crypto.BinaryLike | crypto.KeyObject, value: string) =>
  crypto.createHmac("sha256", key).update(value).digest("hex");

const formatDateParts = (date = new Date()) => {
  const compact = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    xDate: compact,
    shortDate: compact.slice(0, 8),
  };
};

const canonicalizeQuery = (params: Record<string, string>) =>
  Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

const extractResult = (raw: unknown) => {
  const record = asRecord(raw);
  return asRecord(record.Result ?? record.result ?? record.ResponseMetadata?.Result ?? record);
};

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const extractOpenApiErrorMessage = (raw: unknown) => {
  const record = asRecord(raw);
  const responseMetadata = asRecord(record.ResponseMetadata ?? record.response_metadata);
  const responseError = asRecord(responseMetadata.Error ?? responseMetadata.error);
  const code = firstString(responseError.Code, responseError.code);
  const message = firstString(responseError.Message, responseError.message);
  if (code && message) return `${code}: ${message}`;
  if (message) return message;
  if (code) return code;
  return "";
};

const formatOpenApiFailure = (action: ArkOpenApiAction, raw: unknown) => {
  const detail = extractOpenApiErrorMessage(raw);
  return detail ? `ark OpenAPI ${action} failed: ${detail}` : `ark OpenAPI ${action} failed`;
};

const requireOpenApiConfig = () => {
  if (!env.ark.accessKeyId || !env.ark.secretAccessKey) {
    throw errors.generationFailed("VOLC_ACCESS_KEY_ID / VOLC_SECRET_ACCESS_KEY is not configured");
  }
  if (!env.ark.projectName) {
    throw errors.generationFailed("ARK_PROJECT_NAME is not configured");
  }
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number, label: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`${label}_TIMEOUT`)), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    const cause = error instanceof Error && "cause" in error ? (error as { cause?: unknown }).cause : null;
    const causeRecord = asRecord(cause);
    throw errors.generationFailed(`${label} failed`, {
      code: error instanceof Error ? error.message : `${label}_FAILED`,
      causeCode: causeRecord.code,
      causeMessage: causeRecord.message,
      causeName: causeRecord.name,
    });
  } finally {
    clearTimeout(timeout);
  }
};

class ArkOpenApiClient {
  private sign(input: { method: string; pathname: string; query: string; body: string }) {
    const url = new URL(env.ark.openApiEndpoint);
    const host = url.host;
    const { xDate, shortDate } = formatDateParts();
    const payloadHash = sha256Hex(input.body);
    const canonicalHeaders = [
      "content-type:application/json",
      `host:${host}`,
      `x-content-sha256:${payloadHash}`,
      `x-date:${xDate}`,
      "",
    ].join("\n");
    const canonicalRequest = [
      input.method,
      input.pathname,
      input.query,
      canonicalHeaders,
      SIGNED_HEADERS,
      payloadHash,
    ].join("\n");
    const credentialScope = `${shortDate}/${env.ark.region}/${SERVICE}/request`;
    const stringToSign = [
      "HMAC-SHA256",
      xDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join("\n");
    const kDate = hmac(env.ark.secretAccessKey, shortDate);
    const kRegion = hmac(kDate, env.ark.region);
    const kService = hmac(kRegion, SERVICE);
    const kSigning = hmac(kService, "request");
    const signature = hmacHex(kSigning, stringToSign);

    return {
      host,
      payloadHash,
      xDate,
      authorization:
        `HMAC-SHA256 Credential=${env.ark.accessKeyId}/${credentialScope}, ` +
        `SignedHeaders=${SIGNED_HEADERS}, Signature=${signature}`,
    };
  }

  private async request(action: ArkOpenApiAction, body: Record<string, unknown>) {
    requireOpenApiConfig();

    const endpoint = new URL(env.ark.openApiEndpoint);
    const query = canonicalizeQuery({ Action: action, Version: API_VERSION });
    const requestBody = JSON.stringify(body);
    const signature = this.sign({
      method: "POST",
      pathname: endpoint.pathname || "/",
      query,
      body: requestBody,
    });

    const response = await fetchWithTimeout(
      `${env.ark.openApiEndpoint}${endpoint.pathname && endpoint.pathname !== "/" ? "" : "/"}?${query}`,
      {
        method: "POST",
        headers: {
          Authorization: signature.authorization,
          "Content-Type": "application/json",
          Host: signature.host,
          "X-Content-Sha256": signature.payloadHash,
          "X-Date": signature.xDate,
        },
        body: requestBody,
      },
      env.ark.createTimeoutMs,
      `ark.openApi.${action}`,
    );

    const raw = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw errors.generationFailed(formatOpenApiFailure(action, raw), raw);
    }
    const responseMetadata = asRecord(asRecord(raw).ResponseMetadata ?? asRecord(raw).response_metadata);
    const responseError = asRecord(responseMetadata.Error ?? responseMetadata.error);
    if (responseError.Code || responseError.Message) {
      throw errors.generationFailed(formatOpenApiFailure(action, raw), raw);
    }
    return raw;
  }

  async listAssetGroups(): Promise<ArkAssetGroup[]> {
    const raw = await this.request("ListAssetGroups", {
      ProjectName: env.ark.projectName,
      Filter: {
        GroupType: "AIGC",
      },
    });
    const result = extractResult(raw);
    const groups = asArray(
      result.AssetGroups ??
        result.asset_groups ??
        result.Groups ??
        result.groups ??
        result.Items ??
        result.items,
    );
    return groups
      .map((item): ArkAssetGroup | null => {
        const record = asRecord(item);
        const providerGroupId = firstString(
          record.GroupId,
          record.group_id,
          record.Id,
          record.id,
          record.AssetGroupId,
          record.asset_group_id,
        );
        if (!providerGroupId) return null;
        return {
          providerGroupId,
          name: firstString(record.Name, record.name),
          status: firstString(record.Status, record.status),
          raw: item,
        };
      })
      .filter((item): item is ArkAssetGroup => Boolean(item));
  }

  async createAssetGroup(name: string): Promise<ArkAssetGroup> {
    const raw = await this.request("CreateAssetGroup", {
      ProjectName: env.ark.projectName,
      Name: name,
      Description: "Used car video generation AIGC assets",
      GroupType: "AIGC",
    });
    const result = extractResult(raw);
    const providerGroupId = firstString(
      result.GroupId,
      result.group_id,
      result.Id,
      result.id,
      result.AssetGroupId,
      result.asset_group_id,
    );
    if (!providerGroupId) {
      throw errors.generationFailed("ark OpenAPI CreateAssetGroup response missing group id", raw);
    }
    return {
      providerGroupId,
      name,
      status: firstString(result.Status, result.status),
      raw,
    };
  }

  async createAsset(input: {
    groupId: string;
    url: string;
    assetType: ArkVirtualAssetType;
    name: string;
  }): Promise<ArkVirtualAsset> {
    const raw = await this.request("CreateAsset", {
      ProjectName: env.ark.projectName,
      GroupId: input.groupId,
      URL: input.url,
      AssetType: input.assetType,
      Name: input.name,
    });
    return this.normalizeAsset(raw);
  }

  async getAsset(assetId: string): Promise<ArkVirtualAsset> {
    const raw = await this.request("GetAsset", {
      ProjectName: env.ark.projectName,
      Id: assetId,
    });
    return this.normalizeAsset(raw);
  }

  private normalizeAsset(raw: unknown): ArkVirtualAsset {
    const result = extractResult(raw);
    const asset = asRecord(result.Asset ?? result.asset ?? result);
    const providerAssetId = firstString(
      asset.AssetId,
      asset.asset_id,
      asset.Id,
      asset.id,
      result.AssetId,
      result.asset_id,
      result.Id,
      result.id,
    );
    if (!providerAssetId) {
      throw errors.generationFailed("ark OpenAPI asset response missing asset id", raw);
    }
    const assetUri =
      firstString(asset.AssetUri, asset.asset_uri, asset.URI, asset.uri, result.AssetUri, result.asset_uri) ||
      `asset://${providerAssetId}`;
    return {
      providerAssetId,
      assetUri,
      status: firstString(asset.Status, asset.status, result.Status, result.status),
      errorMessage: firstString(asset.ErrorMessage, asset.error_message, result.ErrorMessage, result.error_message),
      raw,
    };
  }
}

export const arkOpenApiClient = new ArkOpenApiClient();
