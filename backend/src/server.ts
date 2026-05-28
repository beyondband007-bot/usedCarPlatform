import { env } from "./config/env";
import { checkMysqlConnection } from "./db/mysql";
import { createApp } from "./app";
import { kieKeyPool } from "./providers/kie/kieKeyPool";

const start = async () => {
  await checkMysqlConnection();
  await kieKeyPool.syncAccounts();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Backend API listening on http://localhost:${env.port}`);
  });
};

start().catch((error) => {
  console.error("Backend failed to start:", error);
  process.exitCode = 1;
});
