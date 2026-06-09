import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import type {
  AccountCreationDecision,
  AccountCreationPolicyCode,
  AccountCreationPolicySnapshot,
  AccountCreationTargetRole,
  AccountCreationTargetScope,
  BackOfficeRoleCode,
} from "./accountCreationPolicyDefaults";
import {
  canCreateAccountFromSnapshot,
  canCreateUserFromSnapshot,
  canPromoteUserToAgentFromSnapshot,
  defaultAccountCreationPolicySnapshot,
  defaultBackOfficePermissionPolicies,
  resolveAccountCreationPolicy,
} from "./accountCreationPolicyDefaults";
import { getCommissionPolicy } from "./commissionPolicyService";

export type AccountCreationOperator = {
  userId: string;
  roleCode: BackOfficeRoleCode;
};

export type AccountCreationPolicyResult = AccountCreationDecision & {
  operatorRole: BackOfficeRoleCode;
  targetRole: AccountCreationTargetRole;
  targetScope?: AccountCreationTargetScope;
  snapshot: AccountCreationPolicySnapshot;
};

type BackOfficePermissionPolicyRow = RowDataPacket & {
  policy_code: AccountCreationPolicyCode;
  is_enabled: 0 | 1;
};

export type AdminPolicyOverride = {
  userId: string;
  username: string;
  displayName: string;
  phone: string | null;
  developerAllowsCreateUsers: boolean;
  developerAllowsCreateAgents: boolean;
  effectiveCanCreateUsers: boolean;
  effectiveCanCreateAgents: boolean;
  updatedByUserId: string | null;
  updatedAt: string | null;
};

export type AgentPolicyOverride = {
  userId: string;
  username: string;
  displayName: string;
  phone: string | null;
  assignedByUserId: string | null;
  assignedByUsername: string | null;
  assignedByDisplayName: string | null;
  commissionRate: number;
  developerAllowsCreateUsers: boolean;
  developerDisabledCreateUsers: boolean;
  effectiveCanCreateUsers: boolean;
  updatedByUserId: string | null;
  updatedAt: string | null;
};

type AdminPolicyOverrideRow = RowDataPacket & {
  user_id: string;
  username: string;
  display_name: string;
  phone: string | null;
  developer_allows_create_users: 0 | 1 | null;
  developer_allows_create_agents: 0 | 1 | null;
  updated_by_user_id: string | null;
  override_updated_at: Date | null;
};

type AgentPolicyOverrideRow = RowDataPacket & {
  user_id: string;
  username: string;
  display_name: string;
  phone: string | null;
  assigned_by_user_id: string | null;
  assigned_by_username: string | null;
  assigned_by_display_name: string | null;
  commission_rate: string | number | null;
  developer_allows_create_users: 0 | 1 | null;
  updated_by_user_id: string | null;
  override_updated_at: Date | null;
};

const policyCodes = new Set<AccountCreationPolicyCode>(
  defaultBackOfficePermissionPolicies.map((policy) => policy.policyCode),
);

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

function mergePolicyRows(rows: BackOfficePermissionPolicyRow[]): AccountCreationPolicySnapshot {
  const snapshot = { ...defaultAccountCreationPolicySnapshot };
  for (const row of rows) {
    if (policyCodes.has(row.policy_code)) {
      snapshot[row.policy_code] = row.is_enabled === 1;
    }
  }
  return snapshot;
}

async function getPolicySnapshot(): Promise<AccountCreationPolicySnapshot> {
  const [rows] = await pool.query<BackOfficePermissionPolicyRow[]>(
    `SELECT policy_code, is_enabled
     FROM back_office_permission_policies`,
  );
  return mergePolicyRows(rows);
}

async function getAdminPolicyOverride(adminUserId: string) {
  const [rows] = await pool.query<Array<RowDataPacket & {
    developer_allows_create_users: 0 | 1 | null;
    developer_allows_create_agents: 0 | 1 | null;
  }>>(
    `SELECT developer_allows_create_users, developer_allows_create_agents
     FROM back_office_admin_policy_overrides
     WHERE admin_user_id = :adminUserId
     LIMIT 1`,
    { adminUserId },
  );
  return {
    createUsers: rows[0]?.developer_allows_create_users !== 0,
    createAgents: rows[0]?.developer_allows_create_agents !== 0,
  };
}

async function getAgentCreateUserOverride(agentUserId: string) {
  const [rows] = await pool.query<Array<RowDataPacket & { developer_allows_create_users: 0 | 1 }>>(
    `SELECT developer_allows_create_users
     FROM back_office_agent_policy_overrides
     WHERE agent_user_id = :agentUserId
     LIMIT 1`,
    { agentUserId },
  );
  return rows[0] ? rows[0].developer_allows_create_users === 1 : true;
}

async function getScopedPolicySnapshot(operator: AccountCreationOperator) {
  const snapshot = await getPolicySnapshot();
  if (operator.roleCode === "admin") {
    const adminOverride = await getAdminPolicyOverride(operator.userId);
    return {
      ...snapshot,
      developer_allows_admin_create_users:
        snapshot.developer_allows_admin_create_users &&
        adminOverride.createUsers,
      developer_allows_admin_create_agents_users:
        snapshot.developer_allows_admin_create_agents_users &&
        adminOverride.createAgents,
    };
  }

  if (operator.roleCode === "agent") {
    return {
      ...snapshot,
      developer_allows_agent_create_users:
        snapshot.developer_allows_agent_create_users &&
        (await getAgentCreateUserOverride(operator.userId)),
    };
  }

  return snapshot;
}

function withSnapshot(
  operator: AccountCreationOperator,
  targetRole: AccountCreationTargetRole,
  snapshot: AccountCreationPolicySnapshot,
  decision: AccountCreationDecision,
  targetScope?: AccountCreationTargetScope,
): AccountCreationPolicyResult {
  return {
    ...decision,
    operatorRole: operator.roleCode,
    targetRole,
    targetScope,
    snapshot,
  };
}

async function canCreateAccount(
  operator: AccountCreationOperator,
  targetRole: AccountCreationTargetRole,
  targetScope?: AccountCreationTargetScope,
): Promise<AccountCreationPolicyResult> {
  const snapshot = await getScopedPolicySnapshot(operator);
  return withSnapshot(
    operator,
    targetRole,
    snapshot,
    canCreateAccountFromSnapshot(operator.roleCode, targetRole, snapshot),
    targetScope,
  );
}

async function canCreateUser(
  operator: AccountCreationOperator,
  targetScope: AccountCreationTargetScope = "personal",
): Promise<AccountCreationPolicyResult> {
  const snapshot = await getScopedPolicySnapshot(operator);
  return withSnapshot(
    operator,
    "user",
    snapshot,
    canCreateUserFromSnapshot(operator.roleCode, snapshot),
    targetScope,
  );
}

async function canPromoteUserToAgent(
  operator: AccountCreationOperator,
): Promise<AccountCreationPolicyResult> {
  const snapshot = await getScopedPolicySnapshot(operator);
  return withSnapshot(
    operator,
    "agent",
    snapshot,
    canPromoteUserToAgentFromSnapshot(operator.roleCode, snapshot),
  );
}

async function setPolicyEnabled(policyCode: AccountCreationPolicyCode, enabled: boolean) {
  const [result] = await pool.query<any>(
    `UPDATE back_office_permission_policies
     SET is_enabled = :enabled
     WHERE policy_code = :policyCode
       AND is_disableable = 1`,
    { policyCode, enabled },
  );

  if (result.affectedRows !== 1) {
    throw errors.forbidden("policy is not disableable or does not exist", { policyCode });
  }

  return getPolicySnapshot();
}

async function listAdminPolicyOverrides(): Promise<{ items: AdminPolicyOverride[] }> {
  const snapshot = await getPolicySnapshot();
  const globalCreateUserGate = snapshot.developer_allows_admin_create_users;
  const globalCreateAgentGate = snapshot.developer_allows_admin_create_agents_users;
  const [rows] = await pool.query<AdminPolicyOverrideRow[]>(
    `SELECT
       u.id user_id,
       u.username,
       u.display_name,
       u.phone,
       override.developer_allows_create_users,
       override.developer_allows_create_agents,
       override.updated_by_user_id,
       override.updated_at override_updated_at
     FROM back_office_role_assignments boa
     JOIN app_users u ON u.id = boa.user_id
     LEFT JOIN back_office_admin_policy_overrides override ON override.admin_user_id = u.id
     WHERE boa.role_code = 'admin'
       AND boa.status = 'active'
       AND u.status = 'active'
     ORDER BY boa.created_at DESC`,
  );

  return {
    items: rows.map((row) => {
      const rowUserGate = row.developer_allows_create_users !== 0;
      const rowAgentGate = row.developer_allows_create_agents !== 0;
      return {
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name,
        phone: row.phone,
        developerAllowsCreateUsers: rowUserGate,
        developerAllowsCreateAgents: rowAgentGate,
        effectiveCanCreateUsers: globalCreateUserGate && rowUserGate,
        effectiveCanCreateAgents: globalCreateAgentGate && rowAgentGate,
        updatedByUserId: row.updated_by_user_id,
        updatedAt: row.override_updated_at?.toISOString() ?? null,
      };
    }),
  };
}

async function setAdminCreateAgentPolicy(input: {
  developerUserId: string;
  adminUserId: string;
  createUsersEnabled?: boolean;
  createAgentsEnabled?: boolean;
}) {
  const [admins] = await pool.query<Array<RowDataPacket & { user_id: string }>>(
    `SELECT u.id user_id
     FROM back_office_role_assignments boa
     JOIN app_users u ON u.id = boa.user_id
     WHERE boa.user_id = :adminUserId
       AND boa.role_code = 'admin'
       AND boa.status = 'active'
       AND u.status = 'active'
     LIMIT 1`,
    { adminUserId: input.adminUserId },
  );

  if (!admins.length) {
    throw errors.invalidParameter("target admin account not found");
  }

  await pool.query<ResultSetHeader>(
    `INSERT INTO back_office_admin_policy_overrides
      (admin_user_id, developer_allows_create_users, developer_allows_create_agents, updated_by_user_id)
     VALUES
      (:adminUserId, COALESCE(:createUsersEnabled, 1), COALESCE(:createAgentsEnabled, 1), :developerUserId)
     ON DUPLICATE KEY UPDATE
      developer_allows_create_users = COALESCE(:createUsersEnabled, developer_allows_create_users),
      developer_allows_create_agents = COALESCE(:createAgentsEnabled, developer_allows_create_agents),
      updated_by_user_id = VALUES(updated_by_user_id)`,
    {
      adminUserId: input.adminUserId,
      createUsersEnabled: input.createUsersEnabled ?? null,
      createAgentsEnabled: input.createAgentsEnabled ?? null,
      developerUserId: input.developerUserId,
    },
  );

  return listAdminPolicyOverrides();
}

async function listAgentPolicyOverrides(
  operator?: AccountCreationOperator,
): Promise<{ items: AgentPolicyOverride[] }> {
  const snapshot = await getPolicySnapshot();
  const globalGate =
    snapshot.developer_allows_agent_create_users &&
    snapshot.admin_allows_agent_create_users;
  const params: Record<string, string> = {};
  const scopeSql = operator?.roleCode === "agent" ? "AND u.id = :agentUserId" : "";
  if (operator?.roleCode === "agent") params.agentUserId = operator.userId;

  const [rows] = await pool.query<AgentPolicyOverrideRow[]>(
    `SELECT
       u.id user_id,
       u.username,
       u.display_name,
       u.phone,
       boa.assigned_by_user_id,
       assigned_by.username assigned_by_username,
       assigned_by.display_name assigned_by_display_name,
       override.commission_rate,
       override.developer_allows_create_users,
       override.updated_by_user_id,
       override.updated_at override_updated_at
     FROM back_office_role_assignments boa
     JOIN app_users u ON u.id = boa.user_id
     LEFT JOIN app_users assigned_by ON assigned_by.id = boa.assigned_by_user_id
     LEFT JOIN back_office_agent_policy_overrides override ON override.agent_user_id = u.id
     WHERE boa.role_code = 'agent'
       AND boa.status = 'active'
       AND u.status = 'active'
       ${scopeSql}
     ORDER BY boa.created_at DESC`,
    params,
  );

  return {
    items: rows.map((row) => {
      const rowGate = row.developer_allows_create_users !== 0;
      return {
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name,
        phone: row.phone,
        assignedByUserId: row.assigned_by_user_id,
        assignedByUsername: row.assigned_by_username,
        assignedByDisplayName: row.assigned_by_display_name,
        commissionRate:
          row.commission_rate === null || row.commission_rate === undefined
            ? getCommissionPolicy().commissionRate
            : toNumber(row.commission_rate),
        developerAllowsCreateUsers: rowGate,
        developerDisabledCreateUsers: !rowGate,
        effectiveCanCreateUsers: globalGate && rowGate,
        updatedByUserId: row.updated_by_user_id,
        updatedAt: row.override_updated_at?.toISOString() ?? null,
      };
    }),
  };
}

async function setAgentCreateUserPolicy(input: {
  developerUserId: string;
  agentUserId: string;
  enabled: boolean;
}) {
  const [agents] = await pool.query<Array<RowDataPacket & { user_id: string }>>(
    `SELECT u.id user_id
     FROM back_office_role_assignments boa
     JOIN app_users u ON u.id = boa.user_id
     WHERE boa.user_id = :agentUserId
       AND boa.role_code = 'agent'
       AND boa.status = 'active'
       AND u.status = 'active'
     LIMIT 1`,
    { agentUserId: input.agentUserId },
  );

  if (!agents.length) {
    throw errors.invalidParameter("target agent account not found");
  }

  await pool.query<ResultSetHeader>(
    `INSERT INTO back_office_agent_policy_overrides
      (agent_user_id, developer_allows_create_users, updated_by_user_id)
     VALUES
      (:agentUserId, :enabled, :developerUserId)
     ON DUPLICATE KEY UPDATE
      developer_allows_create_users = VALUES(developer_allows_create_users),
      updated_by_user_id = VALUES(updated_by_user_id)`,
    {
      agentUserId: input.agentUserId,
      enabled: input.enabled,
      developerUserId: input.developerUserId,
    },
  );

  return listAgentPolicyOverrides();
}

async function setAgentCommissionRate(input: {
  developerUserId: string;
  agentUserId: string;
  commissionRate: number;
}) {
  if (!Number.isFinite(input.commissionRate) || input.commissionRate < 0 || input.commissionRate > 1) {
    throw errors.invalidParameter("commissionRate must be a number between 0 and 1");
  }

  const [agents] = await pool.query<Array<RowDataPacket & { user_id: string }>>(
    `SELECT u.id user_id
     FROM back_office_role_assignments boa
     JOIN app_users u ON u.id = boa.user_id
     WHERE boa.user_id = :agentUserId
       AND boa.role_code = 'agent'
       AND boa.status = 'active'
       AND u.status = 'active'
     LIMIT 1`,
    { agentUserId: input.agentUserId },
  );

  if (!agents.length) {
    throw errors.invalidParameter("target agent account not found");
  }

  await pool.query<ResultSetHeader>(
    `INSERT INTO back_office_agent_policy_overrides
      (agent_user_id, commission_rate, updated_by_user_id)
     VALUES
      (:agentUserId, :commissionRate, :developerUserId)
     ON DUPLICATE KEY UPDATE
      commission_rate = VALUES(commission_rate),
      updated_by_user_id = VALUES(updated_by_user_id)`,
    {
      agentUserId: input.agentUserId,
      commissionRate: input.commissionRate.toFixed(4),
      developerUserId: input.developerUserId,
    },
  );

  return listAgentPolicyOverrides();
}

export const accountCreationPolicyService = {
  canCreateAccount,
  canCreateUser,
  canPromoteUserToAgent,
  getPolicySnapshot,
  listAdminPolicyOverrides,
  listAgentPolicyOverrides,
  resolveAccountCreationPolicy,
  setAdminCreateAgentPolicy,
  setAgentCommissionRate,
  setAgentCreateUserPolicy,
  setPolicyEnabled,
};
