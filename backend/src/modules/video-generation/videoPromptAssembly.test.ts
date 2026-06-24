import assert from "node:assert/strict";

import { buildSeedancePrompt } from "./videoGenerationService";

const singleCarPrompt = buildSeedancePrompt({
  outputRatio: "9:16",
  finalVideoPrompt:
    "Use the selected digital human, professional showroom style and uploaded BMW references.",
  scriptText: "This is the approved English narration.",
  exteriorCount: 2,
  interiorCount: 1,
  dealershipCount: 0,
  userReferenceCount: 1,
  language: "English",
  templateType: "single-car",
  durationSeconds: 13,
  audioDurationMs: 14_328,
});

assert.match(singleCarPrompt, /用 模特 \{\{Mixed 1\}\}/);
assert.match(singleCarPrompt, /英语音频 \{\{Mixed 2\}\}/);
assert.match(singleCarPrompt, /车辆外观参考图 \{\{Mixed 3\}\} \{\{Mixed 4\}\}/);
assert.match(singleCarPrompt, /车辆内饰参考图 \{\{Mixed 5\}\}/);
assert.match(singleCarPrompt, /不要翻译这段演讲/);
assert.match(singleCarPrompt, /不要说中文或普通话/);
assert.match(singleCarPrompt, /无字幕/);
assert.match(
  singleCarPrompt,
  /场景与分镜要求：Use the selected digital human, professional showroom style and uploaded BMW references\./,
);
assert.doesNotMatch(singleCarPrompt, /口播文案/);
assert.doesNotMatch(singleCarPrompt, /This is the approved English narration\./);
assert.doesNotMatch(singleCarPrompt, /真实时长/);
assert.doesNotMatch(singleCarPrompt, /时长要求/);
assert.doesNotMatch(singleCarPrompt, /#image1/);

const chineseSingleCarPrompt = buildSeedancePrompt({
  outputRatio: "9:16",
  finalVideoPrompt: "Use the selected digital human.",
  scriptText: "这是一段中文口播。",
  exteriorCount: 4,
  interiorCount: 3,
  dealershipCount: 0,
  userReferenceCount: 0,
  language: "Chinese",
  templateType: "single-car",
  durationSeconds: 13,
});

assert.match(chineseSingleCarPrompt, /中文（普通话）音频 \{\{Mixed 2\}\}/);
assert.match(chineseSingleCarPrompt, /无字幕。自然对嘴，专业解说视频风格。/);
assert.doesNotMatch(chineseSingleCarPrompt, /口播文案/);
assert.doesNotMatch(chineseSingleCarPrompt, /这是一段中文口播。/);
assert.doesNotMatch(chineseSingleCarPrompt, /时长要求/);
assert.doesNotMatch(chineseSingleCarPrompt, /不要说中文或普通话/);

const dealershipPrompt = buildSeedancePrompt({
  outputRatio: "9:16",
  finalVideoPrompt:
    "Use the real dealership images and the selected lively preset style.",
  scriptText: "欢迎来到安心二手车展厅。",
  exteriorCount: 0,
  interiorCount: 0,
  dealershipCount: 2,
  userReferenceCount: 1,
  language: "Chinese,Yue",
  templateType: "dealership",
});

assert.match(
  dealershipPrompt,
  /用模特 \{\{Mixed 2\}\} ，生成 9:16 竖屏精品二手车销售风格的口播短视频使用音频 \{\{Mixed 3\}\} ，真人口播感，场地参考图 \{\{Mixed 1\}\}/,
);
assert.doesNotMatch(dealershipPrompt, /#image1/);
assert.doesNotMatch(dealershipPrompt, /#audio1/);
assert.doesNotMatch(dealershipPrompt, /车辆外观/);
assert.doesNotMatch(dealershipPrompt, /车辆内饰/);
assert.match(dealershipPrompt, /9:16 竖屏/);

const horizontalDealershipPrompt = buildSeedancePrompt({
  finalVideoPrompt: "Use a wide dealership overview.",
  scriptText: "欢迎来到我们的车场。",
  exteriorCount: 0,
  interiorCount: 0,
  dealershipCount: 1,
  userReferenceCount: 0,
  language: "Chinese",
  templateType: "dealership",
  outputRatio: "16:9",
});
assert.match(horizontalDealershipPrompt, /16:9 横屏/);

console.log(
  JSON.stringify(
    {
      runId: "video-prompt-assembly-20260616-lip-sync",
      singleCarReferences: {
        digitalHuman: "{{Mixed 1}}",
        narration: "{{Mixed 2}}",
        exterior: ["{{Mixed 3}}", "{{Mixed 4}}"],
        interior: ["{{Mixed 5}}"],
      },
      dealershipReferences: {
        dealership: ["{{Mixed 1}}"],
        digitalHuman: "{{Mixed 2}}",
        narration: "{{Mixed 3}}",
      },
      status: "passed",
    },
    null,
    2,
  ),
);
