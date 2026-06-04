import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { getRequiredCurrentUser } from "../auth/authMiddleware";
import { deliveryService } from "./deliveryService";

export const deliveryRoutes = Router();

deliveryRoutes.get(
  "/tasks",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(
      res,
      await deliveryService.listTasks({
        userId: current.user.id,
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
    const current = getRequiredCurrentUser(req);
    ok(
      res,
      await deliveryService.listTaskAssets(String(req.params.taskId), {
        userId: current.user.id,
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
    const current = getRequiredCurrentUser(req);
    ok(res, await deliveryService.createPackage(req.body, current.user.id));
  }),
);

deliveryRoutes.get(
  "/packages",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(
      res,
      await deliveryService.listPackages(
        current.user.id,
        typeof req.query.taskId === "string" ? req.query.taskId : undefined,
      ),
    );
  }),
);

deliveryRoutes.get(
  "/packages/:packageId",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(res, await deliveryService.getPackage(String(req.params.packageId), current.user.id));
  }),
);

deliveryRoutes.delete(
  "/assets",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(res, await deliveryService.deleteAssets(req.body, current.user.id));
  }),
);

deliveryRoutes.delete(
  "/tasks",
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    ok(res, await deliveryService.deleteTasks(req.body, current.user.id));
  }),
);
