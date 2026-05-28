import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { paintRefreshService } from "./paintRefreshService";

export const paintRefreshRoutes = Router();

paintRefreshRoutes.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    const result = await paintRefreshService.createTask(req.body);
    ok(res, result);
  }),
);

