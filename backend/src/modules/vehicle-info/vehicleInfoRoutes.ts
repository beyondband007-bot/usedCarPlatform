import { Router } from "express";
import multer from "multer";

import { env } from "../../config/env";
import { asyncHandler } from "../../shared/asyncHandler";
import { AppError } from "../../shared/errors";
import { ok } from "../../shared/response";

type ShowApiVinResponse = {
  showapi_res_code?: number;
  showapi_res_error?: string;
  showapi_res_body?: Record<string, unknown> & {
    ret_code?: number;
    remark?: string;
    data?: Array<Record<string, unknown>>;
  };
};

type JisuVinResponse = {
  status?: number;
  msg?: string;
  result?: Record<string, unknown>;
};

type ShowApiVinOcrResponse = {
  showapi_res_code?: number;
  showapi_res_error?: string;
  showapi_res_body?: {
    ret_code?: number;
    vin_code?: string;
  };
};

export const vehicleInfoRoutes = Router();
const vinImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 7 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, ["image/jpeg", "image/png"].includes(file.mimetype));
  },
});

vehicleInfoRoutes.post(
  "/vin-ocr",
  vinImageUpload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError(400, 40001, "请上传 JPG、JPEG 或 PNG 图片");
    }
    if (!env.showApiVin.appKey) {
      throw new AppError(503, 50302, "万维易源 VIN OCR 服务尚未配置");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.showApiVin.timeoutMs);

    try {
      const url = new URL(env.showApiVin.ocrBaseUrl);
      url.searchParams.set("appKey", env.showApiVin.appKey);
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          img_base64: req.file.buffer.toString("base64"),
        }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as ShowApiVinOcrResponse;
      const responseBody = payload.showapi_res_body;
      const vin = responseBody?.vin_code?.trim().toUpperCase() ?? "";
      if (
        !response.ok ||
        payload.showapi_res_code !== 0 ||
        responseBody?.ret_code !== 0
      ) {
        throw new AppError(
          502,
          50222,
          payload.showapi_res_error || "VIN 图片识别失败，请更换清晰图片后重试",
        );
      }
      if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
        throw new AppError(422, 42201, "图片中未识别到有效的 VIN 车架号");
      }
      ok(res, { vin });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        502,
        50222,
        error instanceof Error && error.name === "AbortError"
          ? "VIN 图片识别超时，请稍后重试"
          : "VIN 图片识别服务暂时不可用",
      );
    } finally {
      clearTimeout(timeout);
    }
  }),
);

vehicleInfoRoutes.post(
  "/vin-query",
  asyncHandler(async (req, res) => {
    const vin = typeof req.body?.vin === "string" ? req.body.vin.trim().toUpperCase() : "";
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      throw new AppError(400, 40001, "请输入正确的 17 位 VIN 车架号");
    }
    if (!env.jisuVin.appKey) {
      throw new AppError(503, 50301, "VIN 查询服务尚未配置");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.jisuVin.timeoutMs);

    try {
      const url = new URL(env.jisuVin.baseUrl);
      url.searchParams.set("appkey", env.jisuVin.appKey);
      url.searchParams.set("vin", vin);

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      });
      const payload = (await response.json()) as JisuVinResponse;
      if (!response.ok || payload.status !== 0 || !payload.result) {
        throw new AppError(
          502,
          50220,
          payload.msg || "VIN 查询失败，请检查车架号后重试",
        );
      }

      const result = payload.result;
      ok(res, {
        ...result,
        vin,
        brand_name: result.brand,
        year: result.yeartype,
        sale_name: result.name,
        model_name: result.sizetype,
        car_line: result.typename,
        effluent_standard: result.environmentalstandards,
        engine_type: result.enginemodel,
        transmission_type: result.gearbox,
        fuel_Type: result.fueltype,
        output_volume: result.displacement,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        502,
        50221,
        error instanceof Error && error.name === "AbortError"
          ? "VIN 查询超时，请稍后重试"
          : "VIN 查询服务暂时不可用",
      );
    } finally {
      clearTimeout(timeout);
    }
  }),
);

// 万维易源兼容接口：暂不在前端展示或调用，仅为后续切换保留。
vehicleInfoRoutes.post(
  "/vin-query/showapi",
  asyncHandler(async (req, res) => {
    const vin = typeof req.body?.vin === "string" ? req.body.vin.trim().toUpperCase() : "";
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      throw new AppError(400, 40001, "请输入正确的 17 位 VIN 车架号");
    }
    if (!env.showApiVin.appKey) {
      throw new AppError(503, 50301, "万维易源 VIN 查询服务尚未配置");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.showApiVin.timeoutMs);

    try {
      const url = new URL(env.showApiVin.baseUrl);
      url.searchParams.set("appKey", env.showApiVin.appKey);
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ vin }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as ShowApiVinResponse;
      const responseBody = payload.showapi_res_body;
      const result =
        responseBody?.data?.[0] ??
        (responseBody && typeof responseBody === "object" ? responseBody : null);
      if (
        !response.ok ||
        payload.showapi_res_code !== 0 ||
        (responseBody?.ret_code !== undefined && responseBody.ret_code !== 0) ||
        !result
      ) {
        throw new AppError(
          502,
          50220,
          responseBody?.remark ||
            payload.showapi_res_error ||
            "VIN 查询失败，请检查车架号后重试",
        );
      }
      ok(res, { vin, ...result });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        502,
        50221,
        error instanceof Error && error.name === "AbortError"
          ? "VIN 查询超时，请稍后重试"
          : "VIN 查询服务暂时不可用",
      );
    } finally {
      clearTimeout(timeout);
    }
  }),
);
