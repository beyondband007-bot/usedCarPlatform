import type { RowDataPacket } from "mysql2";

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

const policyCodes = new Set<AccountCreationPolicyCode>(
  defaultBackOfficePermissionPolicies.map((policy) => policy.policyCode),
);

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
  const snapshot = await getPolicySnapshot();
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
  const snapshot = await getPolicySnapshot();
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
  const snapshot = await getPolicySnapshot();
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

export const accountCreationPolicyService = {
  canCreateAccount,
  canCreateUser,
  canPromoteUserToAgent,
  getPolicySnapshot,
  resolveAccountCreationPolicy,
  setPolicyEnabled,
};
