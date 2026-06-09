import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { errors } from "../../shared/errors";
import { ok } from "../../shared/response";
import { getRequiredCurrentUser, requirePermission } from "../auth/authMiddleware";
import { BACK_OFFICE_PERMISSION } from "../auth/rbac";
import {
  confirmAgentSettlement,
  createAgentLead,
  createAgentTicket,
  getAgentCustomerLedger,
  getAgentOperationsOverview,
  getPlatformCustomerLedger,
} from "./agentOperationsService";
import {
  buildBillingLifecycleExample,
  buildFunctionSeedPayloads,
  getApplicationIntegrationContract,
  getApplicationIntegrationContracts,
} from "./applicationIntegrationContract";
import { getCommissionPolicy } from "./commissionPolicyService";
import { accountCreationPolicyService } from "./accountCreationPolicyService";
import {
  adjustPlatformUserCredits,
  disablePlatformAgentByCapability,
  deletePlatformUserByCapability,
} from "./platformAccountCapabilities";
import { creditsClient } from "../billing/creditsClient";
import { listPlatformAgents } from "./platformAgentsService";
import { getPlatformDashboard } from "./platformDashboardService";
import { createPlatformUser, promotePlatformUserToAgent } from "./platformUserCreation";

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

platformRoutes.patch(
  "/application-functions/:applicationCode/:functionCode/default-points",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    if (current.user.role !== "developer") {
      throw errors.forbidden("only Developer can update function default points");
    }

    const applicationCode = Array.isArray(req.params.applicationCode)
      ? req.params.applicationCode[0]
      : req.params.applicationCode;
    const functionCode = Array.isArray(req.params.functionCode)
      ? req.params.functionCode[0]
      : req.params.functionCode;
    const defaultPoints = (req.body as { defaultPoints?: unknown })?.defaultPoints;
    const numericPoints = Number(defaultPoints);
    if (!Number.isFinite(numericPoints) || numericPoints < 0) {
      throw errors.invalidParameter("defaultPoints must be a non-negative number");
    }

    ok(
      res,
      await creditsClient.updateFunctionDefaultPoints({
        applicationCode,
        functionCode,
        defaultPoints: numericPoints.toFixed(4),
      }),
    );
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

platformRoutes.post(
  "/users/:userId/promote-agent",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    ok(res, await promotePlatformUserToAgent(req, userId, req.body ?? {}));
  }),
);

platformRoutes.post(
  "/users/:userId/disable-agent",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    ok(res, await disablePlatformAgentByCapability(req, userId, req.body ?? {}));
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
  "/agents",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    ok(res, await listPlatformAgents(req));
  }),
);

platformRoutes.get(
  "/admin-policy-overrides",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    if (current.user.role !== "developer" && current.user.role !== "admin") {
      throw errors.forbidden("admin policy overrides require Developer or Admin role");
    }
    ok(res, await accountCreationPolicyService.listAdminPolicyOverrides());
  }),
);

platformRoutes.patch(
  "/admin-policy-overrides/:adminUserId",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    if (current.user.role !== "developer") {
      throw errors.forbidden("only Developer can update Admin creation policy overrides");
    }

    const adminUserId = Array.isArray(req.params.adminUserId)
      ? req.params.adminUserId[0]
      : req.params.adminUserId;
    const body = req.body as {
      developerAllowsCreateUsers?: unknown;
      developerAllowsCreateAgents?: unknown;
    };
    const createUsersEnabled = body.developerAllowsCreateUsers;
    const createAgentsEnabled = body.developerAllowsCreateAgents;
    if (
      createUsersEnabled === undefined &&
      createAgentsEnabled === undefined
    ) {
      throw errors.invalidParameter("developerAllowsCreateUsers or developerAllowsCreateAgents is required");
    }
    if (createUsersEnabled !== undefined && typeof createUsersEnabled !== "boolean") {
      throw errors.invalidParameter("developerAllowsCreateUsers must be boolean");
    }
    if (createAgentsEnabled !== undefined && typeof createAgentsEnabled !== "boolean") {
      throw errors.invalidParameter("developerAllowsCreateAgents must be boolean");
    }

    ok(
      res,
      await accountCreationPolicyService.setAdminCreateAgentPolicy({
        developerUserId: current.user.id,
        adminUserId,
        createUsersEnabled,
        createAgentsEnabled,
      }),
    );
  }),
);

platformRoutes.get(
  "/agent-policy-overrides",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    if (current.user.role !== "developer" && current.user.role !== "admin" && current.user.role !== "agent") {
      throw errors.forbidden("agent policy overrides require back-office role");
    }
    ok(
      res,
      await accountCreationPolicyService.listAgentPolicyOverrides({
        userId: current.user.id,
        roleCode: current.user.role,
      }),
    );
  }),
);

platformRoutes.patch(
  "/agent-policy-overrides/:agentUserId",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    if (current.user.role !== "developer") {
      throw errors.forbidden("only Developer can update Agent creation policy overrides");
    }

    const agentUserId = Array.isArray(req.params.agentUserId)
      ? req.params.agentUserId[0]
      : req.params.agentUserId;
    const enabled = (req.body as { developerAllowsCreateUsers?: unknown })?.developerAllowsCreateUsers;
    if (typeof enabled !== "boolean") {
      throw errors.invalidParameter("developerAllowsCreateUsers must be boolean");
    }

    ok(
      res,
      await accountCreationPolicyService.setAgentCreateUserPolicy({
        developerUserId: current.user.id,
        agentUserId,
        enabled,
      }),
    );
  }),
);

platformRoutes.get(
  "/commission-policy",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (_req, res) => {
    ok(res, getCommissionPolicy());
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
  "/agent/customers/:relationId/ledger",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    const relationId = Array.isArray(req.params.relationId)
      ? req.params.relationId[0]
      : req.params.relationId;
    ok(res, await getAgentCustomerLedger(req, relationId));
  }),
);

platformRoutes.get(
  "/customers/:customerProfileId/ledger",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    const customerProfileId = Array.isArray(req.params.customerProfileId)
      ? req.params.customerProfileId[0]
      : req.params.customerProfileId;
    ok(res, await getPlatformCustomerLedger(req, customerProfileId));
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
