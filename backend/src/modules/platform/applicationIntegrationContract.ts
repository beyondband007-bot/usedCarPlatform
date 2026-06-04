import { creditFunctionCatalog, type CreditFunctionCatalogItem } from "../billing/creditFunctionCatalog";

export type ApplicationIntegrationStatus = "integrated" | "planned";

export type ApplicationIntegrationFunction = CreditFunctionCatalogItem & {
  code: string;
  applicationCode: string;
};

export type ApplicationIntegrationContract = {
  application: {
    code: string;
    name: string;
    description: string;
    status: ApplicationIntegrationStatus;
  };
  functions: ApplicationIntegrationFunction[];
  billingLifecycle: Array<{
    operation: "estimate" | "freeze" | "settle" | "refund";
    endpoint: string;
    idempotencyKeyPattern: string;
    requiredFields: string[];
  }>;
  onboardingChecklist: string[];
};

const lifecycle = (bizType: string) => [
  {
    operation: "estimate" as const,
    endpoint: "POST /billing/estimate",
    idempotencyKeyPattern: `estimate:${bizType}:<bizId>`,
    requiredFields: [
      "userId",
      "accountScope",
      "applicationCode",
      "functionCode",
      "bizType",
      "bizId",
      "idempotencyKey",
    ],
  },
  {
    operation: "freeze" as const,
    endpoint: "POST /billing/freeze",
    idempotencyKeyPattern: `freeze:${bizType}:<bizId>`,
    requiredFields: ["userId", "billingTaskId", "idempotencyKey"],
  },
  {
    operation: "settle" as const,
    endpoint: "POST /billing/settle",
    idempotencyKeyPattern: `settle:${bizType}:<bizId>`,
    requiredFields: ["userId", "billingTaskId", "idempotencyKey"],
  },
  {
    operation: "refund" as const,
    endpoint: "POST /billing/refund",
    idempotencyKeyPattern: `refund:${bizType}:<bizId>`,
    requiredFields: ["userId", "billingTaskId", "idempotencyKey"],
  },
];

const onboardingChecklist = [
  "Register one application code in Reusable Credits Platform.",
  "Register every billable function code with charge mode and default points.",
  "Derive credits user/tenant/account scope from authenticated product identity.",
  "Estimate and freeze before starting external generation work.",
  "Settle exactly once on successful terminal result.",
  "Refund exactly once on failed or canceled terminal result.",
  "Persist billingTaskId, billingStatus, estimatedPoints, and settledPoints in the product database.",
  "Use deterministic idempotency keys for every billing operation.",
];

const withApplicationCode = (
  applicationCode: string,
  items: CreditFunctionCatalogItem[],
): ApplicationIntegrationFunction[] =>
  items.map((item) => ({
    ...item,
    applicationCode,
  }));

export const applicationIntegrationContracts: ApplicationIntegrationContract[] = [
  {
    application: {
      code: "used-car-platform",
      name: "usedCarPlatform",
      description: "Current used-car image and video generation application.",
      status: "integrated",
    },
    functions: withApplicationCode("used-car-platform", creditFunctionCatalog),
    billingLifecycle: lifecycle("generation_task"),
    onboardingChecklist,
  },
  {
    application: {
      code: "clothing_ai",
      name: "clothing_ai",
      description: "Planned clothing AI application for model, try-on, and lifestyle photo generation.",
      status: "planned",
    },
    functions: withApplicationCode("clothing_ai", [
      {
        code: "model_generate",
        name: "Model Generate",
        description: "Generate virtual model imagery for apparel assets.",
        chargeMode: "estimate_required",
        defaultPoints: "0",
        status: "active",
      },
      {
        code: "try_on_generate",
        name: "Try-on Generate",
        description: "Generate try-on imagery from garment and model inputs.",
        chargeMode: "estimate_required",
        defaultPoints: "0",
        status: "active",
      },
      {
        code: "lifestyle_photo",
        name: "Lifestyle Photo",
        description: "Generate lifestyle product photography for clothing SKUs.",
        chargeMode: "estimate_required",
        defaultPoints: "0",
        status: "active",
      },
    ]),
    billingLifecycle: lifecycle("clothing_generation_task"),
    onboardingChecklist,
  },
];

export function getApplicationIntegrationContracts() {
  return {
    version: "2026-06-04.phase7",
    applications: applicationIntegrationContracts,
  };
}

export function getApplicationIntegrationContract(applicationCode: string) {
  return applicationIntegrationContracts.find((item) => item.application.code === applicationCode) ?? null;
}

export function buildFunctionSeedPayloads(applicationCode: string) {
  const contract = getApplicationIntegrationContract(applicationCode);
  if (!contract) return null;

  return {
    application: contract.application,
    functions: contract.functions.map((item) => ({
      code: item.code,
      name: item.name,
      description: item.description,
      chargeMode: item.chargeMode,
      defaultPoints: item.defaultPoints,
      status: item.status,
    })),
  };
}

export function buildBillingLifecycleExample(input: {
  applicationCode: string;
  functionCode: string;
  userId: number;
  accountScope?: "personal" | "tenant";
  tenantId?: number;
  bizType?: string;
  bizId: string;
  estimatedPoints?: string;
}) {
  const contract = getApplicationIntegrationContract(input.applicationCode);
  const functionContract = contract?.functions.find((item) => item.code === input.functionCode);
  if (!contract || !functionContract) return null;

  const accountScope = input.accountScope ?? "personal";
  const bizType = input.bizType ?? contract.billingLifecycle[0].idempotencyKeyPattern.split(":")[1];

  return {
    estimate: {
      userId: input.userId,
      accountScope,
      tenantId: accountScope === "tenant" ? input.tenantId : undefined,
      applicationCode: input.applicationCode,
      functionCode: input.functionCode,
      estimatedPoints: input.estimatedPoints ?? functionContract.defaultPoints,
      bizType,
      bizId: input.bizId,
      idempotencyKey: `estimate:${bizType}:${input.bizId}`,
    },
    freeze: {
      userId: input.userId,
      billingTaskId: "<billingTaskId from estimate>",
      idempotencyKey: `freeze:${bizType}:${input.bizId}`,
    },
    settle: {
      userId: input.userId,
      billingTaskId: "<billingTaskId from estimate>",
      idempotencyKey: `settle:${bizType}:${input.bizId}`,
    },
    refund: {
      userId: input.userId,
      billingTaskId: "<billingTaskId from estimate>",
      idempotencyKey: `refund:${bizType}:${input.bizId}`,
    },
  };
}
