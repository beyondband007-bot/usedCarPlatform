import {
  buildBillingLifecycleExample,
  buildFunctionSeedPayloads,
  getApplicationIntegrationContract,
} from "../src/modules/platform/applicationIntegrationContract";

const applicationCode = process.argv[2] ?? "clothing_ai";
const contract = getApplicationIntegrationContract(applicationCode);

if (!contract) {
  console.error(`Unknown application contract: ${applicationCode}`);
  process.exitCode = 1;
} else {
  const firstFunction = contract.functions[0];
  const payload = {
    seedPayload: buildFunctionSeedPayloads(applicationCode),
    billingLifecycleExample: buildBillingLifecycleExample({
      applicationCode,
      functionCode: firstFunction.code,
      userId: 101,
      accountScope: "personal",
      bizId: `${applicationCode}-demo-001`,
    }),
  };

  console.log(JSON.stringify(payload, null, 2));
}
