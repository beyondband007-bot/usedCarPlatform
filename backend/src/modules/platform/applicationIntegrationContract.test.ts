import assert from "node:assert/strict";

import {
  applicationIntegrationContracts,
  buildBillingLifecycleExample,
  buildFunctionSeedPayloads,
  getApplicationIntegrationContract,
} from "./applicationIntegrationContract";

const applicationCodePattern = /^[a-z0-9][a-z0-9_-]{1,78}[a-z0-9]$/;
const functionCodePattern = /^[a-z0-9][a-z0-9_-]{1,78}[a-z0-9]$/;
const requiredLifecycleOperations = ["estimate", "freeze", "settle", "refund"];

const applicationCodes = new Set<string>();
for (const contract of applicationIntegrationContracts) {
  assert.match(contract.application.code, applicationCodePattern);
  assert.equal(applicationCodes.has(contract.application.code), false);
  applicationCodes.add(contract.application.code);

  assert.ok(contract.functions.length > 0, `${contract.application.code} must define functions`);
  const functionCodes = new Set<string>();
  for (const fn of contract.functions) {
    assert.equal(fn.applicationCode, contract.application.code);
    assert.match(fn.code, functionCodePattern);
    assert.equal(functionCodes.has(fn.code), false);
    functionCodes.add(fn.code);
    assert.ok(["fixed", "dynamic", "estimate_required"].includes(fn.chargeMode));
    assert.ok(Number(fn.defaultPoints) >= 0);
  }

  assert.deepEqual(
    contract.billingLifecycle.map((item) => item.operation),
    requiredLifecycleOperations,
  );
  for (const step of contract.billingLifecycle) {
    assert.match(step.endpoint, /^POST \/billing\/(estimate|freeze|settle|refund)$/);
    assert.match(step.idempotencyKeyPattern, new RegExp(`^${step.operation}:[a-z_]+:<bizId>$`));
    assert.ok(step.requiredFields.includes("idempotencyKey"));
  }

  const seedPayload = buildFunctionSeedPayloads(contract.application.code);
  assert.equal(seedPayload?.functions.length, contract.functions.length);

  const example = buildBillingLifecycleExample({
    applicationCode: contract.application.code,
    functionCode: contract.functions[0].code,
    userId: 101,
    bizId: `${contract.application.code}-demo-001`,
  });
  assert.equal(example?.estimate.applicationCode, contract.application.code);
  assert.equal(example?.estimate.functionCode, contract.functions[0].code);
  assert.match(example?.estimate.idempotencyKey ?? "", /^estimate:[a-z_]+:/);
  assert.match(example?.freeze.idempotencyKey ?? "", /^freeze:[a-z_]+:/);
  assert.match(example?.settle.idempotencyKey ?? "", /^settle:[a-z_]+:/);
  assert.match(example?.refund.idempotencyKey ?? "", /^refund:[a-z_]+:/);
}

const usedCar = getApplicationIntegrationContract("used-car-platform");
assert.ok(usedCar?.functions.some((item) => item.code === "showroom-light"));
assert.ok(usedCar?.functions.some((item) => item.code === "batch-new-exterior"));

const clothingAi = getApplicationIntegrationContract("clothing_ai");
assert.deepEqual(
  clothingAi?.functions.map((item) => item.code),
  ["model_generate", "try_on_generate", "lifestyle_photo"],
);

console.log("Application integration contracts passed.");
