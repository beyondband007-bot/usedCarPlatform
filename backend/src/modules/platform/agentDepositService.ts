import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";

export type AgentDepositBalance = {
  agentUserId: string;
  balance: number;
  currency: string;
  status: string;
};

type AgentDepositRow = RowDataPacket & {
  agent_user_id: string;
  balance: string | number;
  currency: string;
  status: string;
};

type PlanPriceRow = RowDataPacket & {
  price: string | number;
};

type AgentTargetRow = RowDataPacket & {
  user_id: string;
};

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function ensureAgentDepositAccount(
  connection: PoolConnection,
  agentUserId: string,
  initialBalance = 0,
) {
  await connection.query(
    `INSERT INTO agent_deposit_accounts (agent_user_id, balance, currency, status)
     VALUES (:agentUserId, :initialBalance, 'CNY', 'active')
     ON DUPLICATE KEY UPDATE
      agent_user_id = VALUES(agent_user_id)`,
    { agentUserId, initialBalance },
  );
}

export async function ensureAllAgentDepositAccounts() {
  await pool.query(
    `INSERT INTO agent_deposit_accounts (agent_user_id, balance, currency, status)
     SELECT u.id, 0.00, 'CNY', 'active'
     FROM back_office_role_assignments boa
     JOIN app_users u ON u.id = boa.user_id
     LEFT JOIN agent_deposit_accounts ada ON ada.agent_user_id = u.id
     WHERE boa.role_code = 'agent'
       AND boa.status = 'active'
       AND u.status = 'active'
       AND ada.agent_user_id IS NULL`,
  );
}

export async function listAgentDepositBalances(agentUserIds: string[]) {
  const uniqueIds = Array.from(new Set(agentUserIds.filter(Boolean)));
  const result = new Map<string, AgentDepositBalance>();
  if (!uniqueIds.length) return result;

  const [rows] = await pool.query<AgentDepositRow[]>(
    `SELECT agent_user_id, balance, currency, status
     FROM agent_deposit_accounts
     WHERE agent_user_id IN (:agentUserIds)`,
    { agentUserIds: uniqueIds },
  );

  for (const row of rows) {
    result.set(row.agent_user_id, {
      agentUserId: row.agent_user_id,
      balance: toNumber(row.balance),
      currency: row.currency,
      status: row.status,
    });
  }

  for (const agentUserId of uniqueIds) {
    if (!result.has(agentUserId)) {
      result.set(agentUserId, {
        agentUserId,
        balance: 0,
        currency: "CNY",
        status: "active",
      });
    }
  }

  return result;
}

export async function getPlanDepositCost(
  connection: Pick<PoolConnection, "query">,
  applicationCode: string,
  planCode: string,
) {
  const [rows] = await connection.query<PlanPriceRow[]>(
    `SELECT price
     FROM subscription_plans
     WHERE code = :planCode
       AND application_code = :applicationCode
       AND status = 'active'
     LIMIT 1`,
    { applicationCode, planCode },
  );
  const cost = toNumber(rows[0]?.price);
  if (cost <= 0) {
    throw errors.invalidParameter("subscription plan price is not available", { applicationCode, planCode });
  }
  return cost;
}

export async function assertAgentDepositCanCoverPlan(agentUserId: string, applicationCode: string, planCode: string) {
  const cost = await getPlanDepositCost(pool, applicationCode, planCode);
  const balances = await listAgentDepositBalances([agentUserId]);
  const balance = balances.get(agentUserId)?.balance ?? 0;

  if (balance < cost) {
    throw errors.invalidParameter("agent deposit balance is insufficient", {
      agentUserId,
      requiredAmount: cost,
      availableBalance: balance,
      currency: "CNY",
    });
  }

  return { cost, balance };
}

export async function deductAgentDepositForUserCreation(input: {
  connection: PoolConnection;
  agentUserId: string;
  createdByUserId: string;
  applicationCode: string;
  planCode: string;
  referenceId: string;
}) {
  const cost = await getPlanDepositCost(input.connection, input.applicationCode, input.planCode);
  await ensureAgentDepositAccount(input.connection, input.agentUserId);

  const [rows] = await input.connection.query<AgentDepositRow[]>(
    `SELECT agent_user_id, balance, currency, status
     FROM agent_deposit_accounts
     WHERE agent_user_id = :agentUserId
       AND status = 'active'
     FOR UPDATE`,
    { agentUserId: input.agentUserId },
  );
  const account = rows[0];
  const balanceBefore = toNumber(account?.balance);

  if (!account || balanceBefore < cost) {
    throw errors.invalidParameter("agent deposit balance is insufficient", {
      agentUserId: input.agentUserId,
      requiredAmount: cost,
      availableBalance: balanceBefore,
      currency: account?.currency ?? "CNY",
    });
  }

  const balanceAfter = balanceBefore - cost;
  await input.connection.query(
    `UPDATE agent_deposit_accounts
     SET balance = :balanceAfter
     WHERE agent_user_id = :agentUserId`,
    {
      agentUserId: input.agentUserId,
      balanceAfter,
    },
  );

  await input.connection.query(
    `INSERT INTO agent_deposit_transactions
      (id, agent_user_id, txn_type, amount, balance_before, balance_after,
       currency, reference_type, reference_id, remark, created_by_user_id)
     VALUES
      (:id, :agentUserId, 'deduct_user_plan_cost', :amount, :balanceBefore, :balanceAfter,
       :currency, 'platform_user_creation', :referenceId, :remark, :createdByUserId)`,
    {
      id: createId("adt"),
      agentUserId: input.agentUserId,
      amount: cost,
      balanceBefore,
      balanceAfter,
      currency: account.currency,
      referenceId: input.referenceId,
      remark: `Create User with ${input.applicationCode}/${input.planCode} plan`,
      createdByUserId: input.createdByUserId,
    },
  );

  return {
    amount: cost,
    balanceBefore,
    balanceAfter,
    currency: account.currency,
  };
}

export async function adjustAgentDepositBalance(input: {
  developerUserId: string;
  agentUserId: string;
  amount: number;
  direction: "increase" | "decrease";
  remark?: string | null;
}) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw errors.invalidParameter("amount must be a positive number");
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [agents] = await connection.query<AgentTargetRow[]>(
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

    await ensureAgentDepositAccount(connection, input.agentUserId);

    const [rows] = await connection.query<AgentDepositRow[]>(
      `SELECT agent_user_id, balance, currency, status
       FROM agent_deposit_accounts
       WHERE agent_user_id = :agentUserId
         AND status = 'active'
       FOR UPDATE`,
      { agentUserId: input.agentUserId },
    );
    const account = rows[0];
    if (!account) {
      throw errors.invalidParameter("agent deposit account is not available");
    }

    const balanceBefore = toNumber(account.balance);
    const balanceAfter =
      input.direction === "increase"
        ? balanceBefore + input.amount
        : balanceBefore - input.amount;

    if (balanceAfter < 0) {
      throw errors.invalidParameter("agent deposit balance is insufficient", {
        agentUserId: input.agentUserId,
        requestedAmount: input.amount,
        availableBalance: balanceBefore,
        currency: account.currency,
      });
    }

    await connection.query(
      `UPDATE agent_deposit_accounts
       SET balance = :balanceAfter
       WHERE agent_user_id = :agentUserId`,
      {
        agentUserId: input.agentUserId,
        balanceAfter,
      },
    );

    const transactionId = createId("adt");
    await connection.query(
      `INSERT INTO agent_deposit_transactions
        (id, agent_user_id, txn_type, amount, balance_before, balance_after,
         currency, reference_type, reference_id, remark, created_by_user_id)
       VALUES
        (:id, :agentUserId, :txnType, :amount, :balanceBefore, :balanceAfter,
         :currency, 'developer_deposit_adjustment', :referenceId, :remark, :createdByUserId)`,
      {
        id: transactionId,
        agentUserId: input.agentUserId,
        txnType:
          input.direction === "increase"
            ? "developer_deposit_increase"
            : "developer_deposit_decrease",
        amount: input.amount,
        balanceBefore,
        balanceAfter,
        currency: account.currency,
        referenceId: transactionId,
        remark: input.remark ?? null,
        createdByUserId: input.developerUserId,
      },
    );

    await connection.commit();

    return {
      agentUserId: input.agentUserId,
      direction: input.direction,
      amount: input.amount,
      balanceBefore,
      balanceAfter,
      currency: account.currency,
      transactionId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
