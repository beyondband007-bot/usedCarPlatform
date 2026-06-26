import assert from "node:assert/strict";

import {
  getVideoTemplateDefinition,
  listVideoTemplateDefinitions,
  validateVideoTemplateInputs,
  videoGenerationWorkflowContract,
  videoTemplateCapabilities,
} from "./videoTemplateCatalog";

const definitions = listVideoTemplateDefinitions();

assert.equal(definitions.length, 20);
assert.equal(
  definitions.filter((item) => item.type === "single-car").length,
  8,
);
assert.equal(
  definitions.filter((item) => item.type === "promotion").length,
  0,
);
assert.equal(
  definitions.filter((item) => item.type === "dealership").length,
  12,
);
assert.equal(
  videoTemplateCapabilities.find((item) => item.type === "market")?.status,
  "coming_soon",
);
assert.equal(
  videoTemplateCapabilities.find((item) => item.type === "dealership")
    ?.generationReadiness,
  "ready",
);

assert.deepEqual(videoGenerationWorkflowContract.fixedOutput, {
  durationSeconds: 15,
  resolution: "720p",
  language: "Chinese",
  languageMode: "selectable",
});
assert.deepEqual(videoGenerationWorkflowContract.outputRatioPolicy, {
  mode: "template_locked",
  supportedRatios: ["16:9", "9:16"],
});

assert.equal(getVideoTemplateDefinition("ref-video-001")?.outputRatio, "16:9");
assert.equal(getVideoTemplateDefinition("ref-video-002")?.outputRatio, "9:16");
assert.equal(getVideoTemplateDefinition("ref-video-003")?.outputRatio, "9:16");
assert.equal(getVideoTemplateDefinition("ref-video-006")?.outputRatio, "9:16");
assert.equal(getVideoTemplateDefinition("ref-video-008")?.type, "dealership");
assert.equal(getVideoTemplateDefinition("ref-video-015")?.type, "dealership");
assert.equal(getVideoTemplateDefinition("ref-video-016")?.type, "single-car");
assert.equal(getVideoTemplateDefinition("ref-video-020")?.type, "single-car");

const supportedLanguageValues = videoGenerationWorkflowContract.supportedLanguages.map(
  (item): string => item.value,
);
for (const language of ["Chinese", "Chinese,Yue", "English", "Russian", "Japanese", "Korean", "French"]) {
  assert.ok(supportedLanguageValues.includes(language));
}
for (const legacyLanguage of ["zh-CN", "en", "yue"]) {
  assert.equal(supportedLanguageValues.includes(legacyLanguage), false);
}
assert.ok(
  videoGenerationWorkflowContract.supportedLanguages.every(
    (item) => item.status === "available",
  ),
);

const singleCar = getVideoTemplateDefinition("ref-video-004");
assert.ok(singleCar);
assert.equal(
  validateVideoTemplateInputs(singleCar, {
    brand: "Toyota",
    modelYear: "2025",
    displacement: "2.0L",
    salesName: "Sport",
    series: "Camry",
    vehicleExteriorAssetIds: ["asset_exterior_01"],
    vehicleInteriorAssetIds: [],
    digitalHumanId: "dh-message-01",
    language: "Chinese",
    userReferenceAssetIds: [],
  }).valid,
  true,
);

const invalidSingleCar = validateVideoTemplateInputs(singleCar, {
  brand: "BMW",
  modelYear: "2016",
  displacement: "1.5T",
  salesName: "218i",
  series: "2 Series",
  digitalHumanId: "dh-message-02",
  language: "Chinese",
});
assert.equal(invalidSingleCar.valid, false);
assert.ok(
  invalidSingleCar.issues.some(
    (issue) => issue.field === "vehicleExteriorAssetIds" && issue.code === "required",
  ),
);

const dealership = getVideoTemplateDefinition("ref-video-001");
assert.ok(dealership);
assert.equal(
  dealership.inputRequirements.some(
    (item) =>
      item.key === "vehicleExteriorAssetIds" ||
      item.key === "vehicleInteriorAssetIds" ||
      item.key === "brand" ||
      item.key === "modelYear" ||
      item.key === "displacement" ||
      item.key === "salesName" ||
      item.key === "series",
  ),
  false,
);
const validDealership = validateVideoTemplateInputs(dealership, {
  dealershipName: "Reliable Used Car Showroom",
  dealershipImageAssetIds: ["asset_showroom_01"],
  digitalHumanId: "dh-message-02",
  language: "Chinese",
});
assert.equal(validDealership.valid, true);
assert.equal(
  validateVideoTemplateInputs(dealership, {
    dealershipName: "Harbour Used Cars",
    dealershipImageAssetIds: ["asset_showroom_01"],
    digitalHumanId: "dh-message-02",
    language: "English",
  }).valid,
  true,
);
assert.equal(
  validateVideoTemplateInputs(dealership, {
    dealershipName: "Harbour Used Cars",
    dealershipImageAssetIds: ["asset_showroom_01"],
    digitalHumanId: "dh-message-02",
    language: "zh-CN",
  }).valid,
  false,
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
      runId: "video-template-contract-20260615-test-message",
      templateCount: definitions.length,
      typeCounts: {
        singleCar: 8,
        promotion: 0,
        dealership: 12,
        market: 0,
      },
      fixedOutput: videoGenerationWorkflowContract.fixedOutput,
      dynamicValidation: "passed",
      supportedLanguages: supportedLanguageValues,
      taskLifecycle: ["poll", "cancel", "history", "regenerate"],
      status: "passed",
    },
    null,
    2,
  ),
);
