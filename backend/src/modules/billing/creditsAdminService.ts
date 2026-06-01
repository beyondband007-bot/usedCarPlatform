import { env } from "../../config/env";
import type { BillingIdentity } from "./billingIdentity";
import { creditsClient, type CreditTransactionResponse } from "./creditsClient";

const transactionTime = (transaction: CreditTransactionResponse) =>
  new Date(transaction.createdAt).getTime() || 0;

export const getCreditsAdminOverview = async (identity: BillingIdentity) => {
  const [applications, functions, accounts, products] = await Promise.all([
    creditsClient.listApplications(),
    creditsClient.listFunctions(env.credits.applicationCode),
    creditsClient.listAccounts({ userId: identity.userId }),
    creditsClient.listRechargeProducts(),
  ]);

  const transactionResults = await Promise.all(
    accounts.accounts.map((account) =>
      creditsClient.listAccountTransactions({
        accountId: account.id,
        userId: identity.userId,
        limit: 20,
      }),
    ),
  );

  const transactions = transactionResults
    .flatMap((result) => result.transactions)
    .sort((a, b) => transactionTime(b) - transactionTime(a))
    .slice(0, 50);

  return {
    identity,
    applications: applications.applications,
    functions: functions.functions,
    accounts: accounts.accounts,
    transactions,
    rechargeProducts: products.products,
  };
};

