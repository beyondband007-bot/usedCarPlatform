import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { authService } from "./authService";

export const authRoutes = Router();

authRoutes.post(
  "/register",
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    ok(res, result);
  }),
);

authRoutes.post(
  "/login",
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    ok(res, result);
  }),
);

authRoutes.get(
  "/me",
  asyncHandler(async (req, res) => {
    const result = await authService.me(req.headers);
    ok(res, result);
  }),
);

authRoutes.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const result = await authService.logout(req.headers);
    ok(res, result);
  }),
);
