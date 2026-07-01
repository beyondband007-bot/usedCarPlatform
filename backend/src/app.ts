import path from "node:path";

import cors from "cors";
import express from "express";

import { env } from "./config/env";
import { assetsRoutes } from "./modules/assets/assetsRoutes";
import { requireCurrentUser } from "./modules/auth/authMiddleware";
import { authRoutes } from "./modules/auth/authRoutes";
import { creditsRoutes } from "./modules/billing/creditsRoutes";
import { enterpriseRoutes } from "./modules/enterprise/enterpriseRoutes";
import { moduleRoutes } from "./modules/moduleRoutes";
import { platformRoutes } from "./modules/platform/platformRoutes";
import { tasksRoutes } from "./modules/tasks/tasksRoutes";
import { userLogoRoutes } from "./modules/user-logo/userLogoRoutes";
import { vehicleInfoRoutes } from "./modules/vehicle-info/vehicleInfoRoutes";
import { errorHandler, notFoundHandler, requestIdMiddleware } from "./shared/response";

export const createApp = () => {
  const app = express();

  app.use(cors());
  const proxyPaymentNotification = async (
    req: express.Request,
    res: express.Response,
    targetPath: string,
  ) => {
    try {
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
      const response = await fetch(`${env.credits.baseUrl}${targetPath}`, {
        method: "POST",
        headers: {
          "content-type": req.headers["content-type"] ?? "application/octet-stream",
          ...(typeof req.headers["wechatpay-timestamp"] === "string"
            ? { "wechatpay-timestamp": req.headers["wechatpay-timestamp"] }
            : {}),
          ...(typeof req.headers["wechatpay-nonce"] === "string"
            ? { "wechatpay-nonce": req.headers["wechatpay-nonce"] }
            : {}),
          ...(typeof req.headers["wechatpay-signature"] === "string"
            ? { "wechatpay-signature": req.headers["wechatpay-signature"] }
            : {}),
          ...(typeof req.headers["wechatpay-serial"] === "string"
            ? { "wechatpay-serial": req.headers["wechatpay-serial"] }
            : {}),
        },
        body: body.toString("utf8"),
      });
      const responseBody = await response.text();
      res.status(response.status);
      res.type(response.headers.get("content-type") ?? "text/plain");
      res.send(responseBody);
    } catch (error) {
      res.status(502).json({
        code: "PAYMENT_CALLBACK_PROXY_FAILED",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  app.post(
    "/api/v1/alipay/notify",
    express.raw({ type: "application/x-www-form-urlencoded", limit: "512kb" }),
    (req, res) => void proxyPaymentNotification(req, res, "/api/v1/alipay/notify"),
  );
  app.post(
    "/api/v1/wechatpay/notify",
    express.raw({ type: "application/json", limit: "512kb" }),
    (req, res) => void proxyPaymentNotification(req, res, "/api/v1/wechatpay/notify"),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(requestIdMiddleware);
  app.use("/uploads", express.static(path.resolve(env.uploadDir)));
  app.use("/results", express.static(path.resolve(env.resultsDir)));
  app.use("/packages", express.static(path.resolve(env.packagesDir)));
  app.use("/scene-refs", express.static(path.resolve(env.sceneRefsDir)));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/assets", requireCurrentUser, assetsRoutes);
  app.use("/api/v1/credits", creditsRoutes);
  app.use("/api/v1/enterprise", requireCurrentUser, enterpriseRoutes);
  app.use("/api/v1/platform", platformRoutes);
  app.use("/api/v1/tasks", requireCurrentUser, tasksRoutes);
  app.use("/api/v1/modules", requireCurrentUser, moduleRoutes);
  app.use("/api/v1/user", requireCurrentUser, userLogoRoutes);
  app.use("/api/v1/vehicle-info", requireCurrentUser, vehicleInfoRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
