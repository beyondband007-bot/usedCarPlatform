import { env } from "./config/env";
import { checkMysqlConnection } from "./db/mysql";
import { createApp } from "./app";
import { syncCreditFunctionCatalog } from "./modules/billing/creditFunctionSync";
import { kieKeyPool } from "./providers/kie/kieKeyPool";

const start = async () => {
  await checkMysqlConnection();
  await kieKeyPool.syncAccounts();
  await syncCreditFunctionCatalog();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Backend API listening on http://localhost:${env.port}`);
  });
};

start().catch((error) => {
  console.error("Backend failed to start:", error);
  process.exitCode = 1;
});
