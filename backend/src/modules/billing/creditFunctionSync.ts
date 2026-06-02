import { env } from "../../config/env";
import { creditFunctionCatalog } from "./creditFunctionCatalog";
import { creditsClient } from "./creditsClient";

export const syncCreditFunctionCatalog = async () => {
  if (!env.credits.enabled) return;

  for (const item of creditFunctionCatalog) {
    await creditsClient.registerFunction(item);
  }
};
