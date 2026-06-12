import assert from "node:assert/strict";

import { buildSeedancePrompt } from "./videoGenerationService";

const singleCarPrompt = buildSeedancePrompt({
  finalVideoPrompt:
    "Use the selected digital human, professional showroom style and uploaded BMW references.",
  scriptText: "This is the approved English narration.",
  exteriorCount: 2,
  interiorCount: 1,
  dealershipCount: 0,
  userReferenceCount: 1,
  language: "en",
  templateType: "single-car",
});

assert.match(singleCarPrompt, /#image1/);
assert.match(singleCarPrompt, /#image2、#image3/);
assert.match(singleCarPrompt, /#image4/);
assert.match(singleCarPrompt, /#image5/);
assert.match(singleCarPrompt, /#audio1/);
assert.match(singleCarPrompt, /英文/);
assert.match(singleCarPrompt, /严格 15 秒/);
assert.match(singleCarPrompt, /This is the approved English narration/);

const dealershipPrompt = buildSeedancePrompt({
  finalVideoPrompt:
    "Use the real dealership images and the selected lively preset style.",
  scriptText: "欢迎来到安心二手车展厅。",
  exteriorCount: 0,
  interiorCount: 0,
  dealershipCount: 2,
  userReferenceCount: 1,
  language: "yue",
  templateType: "dealership",
});

assert.match(dealershipPrompt, /模板类型：车场介绍/);
assert.match(dealershipPrompt, /车场与展厅事实依据：#image2、#image3/);
assert.match(dealershipPrompt, /用户额外参考：#image4/);
assert.match(dealershipPrompt, /粤语/);
assert.match(dealershipPrompt, /不得虚构库存、价格或服务承诺/);

console.log(
  JSON.stringify(
    {
      runId: "video-prompt-assembly-20260611-01",
      singleCarReferences: {
        digitalHuman: "#image1",
        exterior: ["#image2", "#image3"],
        interior: ["#image4"],
        userReference: ["#image5"],
        narration: "#audio1",
      },
      dealershipReferences: {
        digitalHuman: "#image1",
        dealership: ["#image2", "#image3"],
        userReference: ["#image4"],
        narration: "#audio1",
      },
      status: "passed",
    },
    null,
    2,
  ),
);
