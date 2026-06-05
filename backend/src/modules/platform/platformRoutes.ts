import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { errors } from "../../shared/errors";
import { ok } from "../../shared/response";
import { requirePermission } from "../auth/authMiddleware";
import { BACK_OFFICE_PERMISSION } from "../auth/rbac";
import {
  confirmAgentSettlement,
  createAgentLead,
  createAgentTicket,
  getAgentOperationsOverview,
} from "./agentOperationsService";
import {
  buildBillingLifecycleExample,
  buildFunctionSeedPayloads,
  getApplicationIntegrationContract,
  getApplicationIntegrationContracts,
} from "./applicationIntegrationContract";
import {
  adjustPlatformUserCredits,
  deletePlatformUserByCapability,
} from "./platformAccountCapabilities";
import { getPlatformDashboard } from "./platformDashboardService";
import { createPlatformUser } from "./platformUserCreation";

export const platformRoutes = Router();

platformRoutes.post(
  "/users",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    ok(res, await createPlatformUser(req, req.body));
  }),
);

platformRoutes.post(
  "/credits/adjustments",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    ok(res, await adjustPlatformUserCredits(req, req.body));
  }),
);

platformRoutes.delete(
  "/users/:userId",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    ok(res, await deletePlatformUserByCapability(req, userId, req.body ?? {}));
  }),
);

platformRoutes.get(
  "/dashboard",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    ok(res, await getPlatformDashboard(req));
  }),
);

platformRoutes.get(
  "/agent/overview",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    ok(res, await getAgentOperationsOverview(req));
  }),
);

platformRoutes.get(
  "/integration-contract",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (_req, res) => {
    ok(res, getApplicationIntegrationContracts());
  }),
);

platformRoutes.get(
  "/integration-contract/:applicationCode",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    const applicationCode = Array.isArray(req.params.applicationCode)
      ? req.params.applicationCode[0]
      : req.params.applicationCode;
    const contract = getApplicationIntegrationContract(applicationCode);
    if (!contract) throw errors.invalidParameter("application integration contract not found");
    ok(res, contract);
  }),
);

platformRoutes.get(
  "/integration-contract/:applicationCode/seed-payload",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    const applicationCode = Array.isArray(req.params.applicationCode)
      ? req.params.applicationCode[0]
      : req.params.applicationCode;
    const payload = buildFunctionSeedPayloads(applicationCode);
    if (!payload) throw errors.invalidParameter("application integration contract not found");
    ok(res, payload);
  }),
);

platformRoutes.get(
  "/integration-contract/:applicationCode/billing-example/:functionCode",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    const applicationCode = Array.isArray(req.params.applicationCode)
      ? req.params.applicationCode[0]
      : req.params.applicationCode;
    const functionCode = Array.isArray(req.params.functionCode)
      ? req.params.functionCode[0]
      : req.params.functionCode;
    const userId = Number(req.query.userId ?? 1);
    const bizId = String(req.query.bizId ?? "demo-task-001");
    const example = buildBillingLifecycleExample({
      applicationCode,
      functionCode,
      userId: Number.isFinite(userId) ? userId : 1,
      accountScope: req.query.accountScope === "tenant" ? "tenant" : "personal",
      tenantId: req.query.tenantId ? Number(req.query.tenantId) : undefined,
      bizId,
    });
    if (!example) throw errors.invalidParameter("application billing example not found");
    ok(res, example);
  }),
);

platformRoutes.post(
  "/agent/leads",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    ok(res, await createAgentLead(req, req.body));
  }),
);

platformRoutes.post(
  "/agent/tickets",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    ok(res, await createAgentTicket(req, req.body));
  }),
);

platformRoutes.post(
  "/agent/settlements/:settlementId/confirm",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    const settlementId = Array.isArray(req.params.settlementId)
      ? req.params.settlementId[0]
      : req.params.settlementId;
    ok(res, await confirmAgentSettlement(req, settlementId));
  }),
);
