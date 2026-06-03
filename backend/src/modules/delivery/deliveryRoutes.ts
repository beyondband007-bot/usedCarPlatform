import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { deliveryService } from "./deliveryService";

export const deliveryRoutes = Router();

deliveryRoutes.get(
  "/tasks",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await deliveryService.listTasks({
        status: typeof req.query.status === "string" ? req.query.status : undefined,
        page: Number(req.query.page ?? 1),
        pageSize: Number(req.query.pageSize ?? 20),
        refresh: req.query.refresh === "1" || req.query.refresh === "true",
      }),
    );
  }),
);

deliveryRoutes.get(
  "/tasks/:taskId/assets",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await deliveryService.listTaskAssets(String(req.params.taskId), {
        ratio: typeof req.query.ratio === "string" ? req.query.ratio : undefined,
        page: Number(req.query.page ?? 1),
        pageSize: Number(req.query.pageSize ?? 50),
        refresh: req.query.refresh === "1" || req.query.refresh === "true",
      }),
    );
  }),
);

deliveryRoutes.post(
  "/packages",
  asyncHandler(async (req, res) => {
    ok(res, await deliveryService.createPackage(req.body));
  }),
);

deliveryRoutes.get(
  "/packages",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await deliveryService.listPackages(
        typeof req.query.taskId === "string" ? req.query.taskId : undefined,
      ),
    );
  }),
);

deliveryRoutes.get(
  "/packages/:packageId",
  asyncHandler(async (req, res) => {
    ok(res, await deliveryService.getPackage(String(req.params.packageId)));
  }),
);

deliveryRoutes.delete(
  "/assets",
  asyncHandler(async (req, res) => {
    ok(res, await deliveryService.deleteAssets(req.body));
  }),
);

deliveryRoutes.delete(
  "/tasks",
  asyncHandler(async (req, res) => {
    ok(res, await deliveryService.deleteTasks(req.body));
  }),
);
