import path from "node:path";

import cors from "cors";
import express from "express";

import { env } from "./config/env";
import { assetsRoutes } from "./modules/assets/assetsRoutes";
import { creditsRoutes } from "./modules/billing/creditsRoutes";
import { moduleRoutes } from "./modules/moduleRoutes";
import { tasksRoutes } from "./modules/tasks/tasksRoutes";
import { userLogoRoutes } from "./modules/user-logo/userLogoRoutes";
import { errorHandler, notFoundHandler, requestIdMiddleware } from "./shared/response";

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use(requestIdMiddleware);
  app.use("/uploads", express.static(path.resolve(env.uploadDir)));
  app.use("/results", express.static(path.resolve(env.resultsDir)));
  app.use("/packages", express.static(path.resolve(env.packagesDir)));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/v1/assets", assetsRoutes);
  app.use("/api/v1/credits", creditsRoutes);
  app.use("/api/v1/tasks", tasksRoutes);
  app.use("/api/v1/modules", moduleRoutes);
  app.use("/api/v1/user", userLogoRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
