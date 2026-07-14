import { env } from "./config/env";
import { checkMysqlConnection } from "./db/mysql";
import { createApp } from "./app";
import { syncCreditFunctionCatalog } from "./modules/billing/creditFunctionSync";
import { languageConversionService } from "./modules/language-conversion/languageConversionService";
import { longVideoService } from "./modules/long-video-generation/longVideoService";
import { kieKeyPool } from "./providers/kie/kieKeyPool";

const start = async () => {
  await checkMysqlConnection();
  await kieKeyPool.syncAccounts();
  await kieKeyPool.reconcileConcurrency();
  await syncCreditFunctionCatalog();
  await languageConversionService.reconcileInterruptedProcessingTasks();
  await longVideoService.reconcileInterruptedTasks();

  const longVideoBillingTimer = setInterval(() => {
    void longVideoService.reconcileBilling().catch((error) => {
      console.error("Long-video billing reconciliation failed:", error);
    });
  }, 5 * 60 * 1000);
  longVideoBillingTimer.unref();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Backend API listening on http://localhost:${env.port}`);
  });
};

start().catch((error) => {
  console.error("Backend failed to start:", error);
  process.exitCode = 1;
});
