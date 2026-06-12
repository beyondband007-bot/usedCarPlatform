import assert from "node:assert/strict";

import {
  getVideoTemplateDefinition,
  listVideoTemplateDefinitions,
  validateVideoTemplateInputs,
  videoGenerationWorkflowContract,
  videoTemplateCapabilities,
} from "./videoTemplateCatalog";

const definitions = listVideoTemplateDefinitions();

assert.equal(definitions.length, 6);
assert.equal(
  definitions.filter((item) => item.type === "single-car").length,
  3,
);
assert.equal(
  definitions.filter((item) => item.type === "promotion").length,
  2,
);
assert.equal(
  definitions.filter((item) => item.type === "dealership").length,
  1,
);
assert.equal(
  videoTemplateCapabilities.find((item) => item.type === "market")?.status,
  "coming_soon",
);
assert.equal(
  videoTemplateCapabilities.find((item) => item.type === "promotion")
    ?.generationReadiness,
  "ready",
);
assert.equal(
  videoTemplateCapabilities.find((item) => item.type === "dealership")
    ?.generationReadiness,
  "ready",
);
assert.deepEqual(videoGenerationWorkflowContract.fixedOutput, {
  durationSeconds: 15,
  resolution: "720p",
  outputRatio: "9:16",
  language: "zh-CN",
  languageMode: "selectable",
});
assert.deepEqual(
  videoGenerationWorkflowContract.supportedLanguages.map((item) => ({
    value: item.value,
    status: item.status,
  })),
  [
    { value: "zh-CN", status: "available" },
    { value: "en", status: "available" },
    { value: "yue", status: "available" },
  ],
);

const singleCar = getVideoTemplateDefinition("ref-video-001");
assert.ok(singleCar);
assert.equal(
  validateVideoTemplateInputs(singleCar, {
    brand: "丰田",
    modelYear: "2025",
    displacement: "2.0L",
    salesName: "运动版",
    series: "凯美瑞",
    vehicleExteriorAssetIds: ["asset_exterior_01"],
    vehicleInteriorAssetIds: [],
    digitalHumanId: "dh-female-01",
    language: "zh-CN",
    userReferenceAssetIds: [],
  }).valid,
  true,
);

const promotion = getVideoTemplateDefinition("ref-video-003");
assert.ok(promotion);
const invalidPromotion = validateVideoTemplateInputs(promotion, {
  brand: "宝马",
  modelYear: "2016",
  displacement: "1.5T",
  salesName: "218i",
  series: "2系旅行车",
  vehicleExteriorAssetIds: ["asset_exterior_01"],
  digitalHumanId: "dh-female-02",
  language: "zh-CN",
});
assert.equal(invalidPromotion.valid, false);
assert.ok(
  invalidPromotion.issues.some(
    (issue) => issue.field === "promotionText" && issue.code === "required",
  ),
);

const dealership = getVideoTemplateDefinition("ref-video-006");
assert.ok(dealership);
const validDealership = validateVideoTemplateInputs(dealership, {
  dealershipName: "靠谱二手车展厅",
  dealershipImageAssetIds: ["asset_showroom_01"],
  digitalHumanId: "dh-male-01",
  language: "zh-CN",
});
assert.equal(validDealership.valid, true);
assert.equal(
  validateVideoTemplateInputs(dealership, {
    dealershipName: "Harbour Used Cars",
    dealershipImageAssetIds: ["asset_showroom_01"],
    digitalHumanId: "dh-male-01",
    language: "en",
  }).valid,
  true,
);

const workflowSteps = videoGenerationWorkflowContract.workflow.map(
  (item) => item.step,
);
assert.ok(workflowSteps.includes("cancel_task"));
assert.ok(workflowSteps.includes("list_history"));
assert.ok(workflowSteps.includes("regenerate"));

console.log(
  JSON.stringify(
    {
      runId: "video-template-contract-20260611-02",
      templateCount: definitions.length,
      typeCounts: {
        singleCar: 3,
        promotion: 2,
        dealership: 1,
        market: 0,
      },
      fixedOutput: videoGenerationWorkflowContract.fixedOutput,
      dynamicValidation: "passed",
      supportedLanguages: ["zh-CN", "en", "yue"],
      taskLifecycle: ["poll", "cancel", "history", "regenerate"],
      status: "passed",
    },
    null,
    2,
  ),
);
