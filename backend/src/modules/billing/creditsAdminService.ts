import { env } from "../../config/env";
import { pool } from "../../db/mysql";
import type { RowDataPacket } from "mysql2";
import type { BillingIdentity } from "./billingIdentity";
import {
  creditsClient,
  type CreditTransactionResponse,
  type CreditTransactionWithApplicationResponse,
  type CreditsApplicationResponse,
  type CreditsFunctionResponse,
} from "./creditsClient";

const transactionTime = (transaction: CreditTransactionResponse) =>
  new Date(transaction.createdAt).getTime() || 0;

type CustomerProfileRow = RowDataPacket & {
  id: string;
  application_code: string;
  user_id: string;
  username: string;
  display_name: string;
  phone: string | null;
  role_code: string | null;
  credits_user_id: number;
  account_scope: "personal" | "tenant";
  credits_tenant_id: number | null;
  created_by_user_id: string;
  created_by_role_code: string;
  status: string;
  created_at: Date;
};

const FALLBACK_APPLICATIONS: CreditsApplicationResponse[] = [
  {
    id: 0,
    code: env.credits.applicationCode,
    name: "usedCarPlatform",
    description: "Current used car image generation application",
    status: "active",
  },
  {
    id: -1,
    code: "clothing_ai",
    name: "clothing_ai",
    description: "Planned clothing AI application",
    status: "planned",
  },
];

const PLANNED_FUNCTIONS: CreditsFunctionResponse[] = [
  {
    id: -101,
    applicationId: -1,
    applicationCode: "clothing_ai",
    applicationName: "clothing_ai",
    code: "model_generate",
    name: "Model Generate",
    description: "Planned model generation function",
    chargeMode: "estimate_required",
    defaultPoints: "0",
    status: "planned",
  },
  {
    id: -102,
    applicationId: -1,
    applicationCode: "clothing_ai",
    applicationName: "clothing_ai",
    code: "try_on_generate",
    name: "Try-on Generate",
    description: "Planned try-on generation function",
    chargeMode: "estimate_required",
    defaultPoints: "0",
    status: "planned",
  },
  {
    id: -103,
    applicationId: -1,
    applicationCode: "clothing_ai",
    applicationName: "clothing_ai",
    code: "lifestyle_photo",
    name: "Lifestyle Photo",
    description: "Planned lifestyle product photo function",
    chargeMode: "estimate_required",
    defaultPoints: "0",
    status: "planned",
  },
];

function mergeApplications(applications: CreditsApplicationResponse[]) {
  const byCode = new Map<string, CreditsApplicationResponse>();
  for (const application of FALLBACK_APPLICATIONS) {
    byCode.set(application.code, application);
  }
  for (const application of applications) {
    byCode.set(application.code, application);
  }
  return [...byCode.values()].sort((left, right) => left.code.localeCompare(right.code));
}

async function listFunctionsForApplications(applications: CreditsApplicationResponse[]) {
  const functionGroups = await Promise.all(
    applications
      .filter((application) => application.status !== "planned")
      .map(async (application) => {
        try {
          const result = await creditsClient.listFunctions(application.code);
          return result.functions.map((item) => ({
            ...item,
            applicationCode: application.code,
            applicationName: application.name,
          }));
        } catch {
          return [] as CreditsFunctionResponse[];
        }
      }),
  );

  const functions = functionGroups.flat();
  const hasClothingAi = applications.some((application) => application.code === "clothing_ai");
  return hasClothingAi ? [...functions, ...PLANNED_FUNCTIONS] : functions;
}

function enrichTransactions(
  transactions: CreditTransactionResponse[],
  applications: CreditsApplicationResponse[],
  functions: CreditsFunctionResponse[],
): CreditTransactionWithApplicationResponse[] {
  const applicationsById = new Map(applications.map((item) => [item.id, item]));
  const functionsById = new Map(functions.map((item) => [item.id, item]));

  return transactions.map((transaction) => {
    const application = transaction.applicationId ? applicationsById.get(transaction.applicationId) : null;
    const fn = transaction.functionId ? functionsById.get(transaction.functionId) : null;
    return {
      ...transaction,
      applicationCode: application?.code ?? fn?.applicationCode ?? null,
      applicationName: application?.name ?? fn?.applicationName ?? null,
      functionCode: fn?.code ?? null,
      functionName: fn?.name ?? null,
    };
  });
}

async function listCustomerProfiles() {
  const [rows] = await pool.query<CustomerProfileRow[]>(
    `SELECT
       acl.id,
       acl.application_code,
       acl.user_id,
       u.username,
       u.display_name,
       u.phone,
       MIN(aur.role_code) role_code,
       acl.credits_user_id,
       acl.account_scope,
       acl.credits_tenant_id,
       acl.created_by_user_id,
       acl.created_by_role_code,
       acl.status,
       acl.created_at
     FROM application_customer_links acl
     JOIN app_users u ON u.id = acl.user_id
     LEFT JOIN app_user_roles aur ON aur.user_id = u.id
     GROUP BY acl.id, acl.application_code, acl.user_id, u.username, u.display_name,
              u.phone, acl.credits_user_id, acl.account_scope, acl.credits_tenant_id,
              acl.created_by_user_id, acl.created_by_role_code, acl.status, acl.created_at
     ORDER BY acl.created_at DESC
     LIMIT 100`,
  );

  return rows.map((row) => ({
    id: row.id,
    applicationCode: row.application_code,
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    phone: row.phone,
    role: row.role_code ?? "enterprise",
    creditsUserId: row.credits_user_id,
    accountScope: row.account_scope,
    creditsTenantId: row.credits_tenant_id,
    createdByUserId: row.created_by_user_id,
    createdByRole: row.created_by_role_code,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  }));
}

export const getCreditsAdminOverview = async (identity: BillingIdentity) => {
  const [applicationResult, accounts, products, customerProfiles] = await Promise.all([
    creditsClient.listApplications(),
    creditsClient.listAccounts({ userId: identity.userId }),
    creditsClient.listRechargeProducts(),
    listCustomerProfiles(),
  ]);
  const applications = mergeApplications(applicationResult.applications);
  const functions = await listFunctionsForApplications(applications);

  const transactionResults = await Promise.all(
    accounts.accounts.map((account) =>
      creditsClient.listAccountTransactions({
        accountId: account.id,
        userId: identity.userId,
        limit: 20,
      }),
    ),
  );

  const transactions = enrichTransactions(
    transactionResults
      .flatMap((result) => result.transactions)
      .sort((a, b) => transactionTime(b) - transactionTime(a))
      .slice(0, 50),
    applications,
    functions,
  );

  return {
    identity,
    application:
      applications.find((application) => application.code === env.credits.applicationCode) ??
      applications[0] ??
      null,
    applications,
    functions,
    accounts: accounts.accounts,
    transactions,
    rechargeProducts: products.products,
    customerProfiles,
  };
};
