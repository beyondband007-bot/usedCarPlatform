import assert from "node:assert/strict";
import {
  planInteriorTasks,
  resolveInteriorProcessingKind,
} from "./batchInteriorWorkflow";
import {
  batchInteriorCollagePrompt,
  batchInteriorSceneCleanPrompt,
  batchInteriorScenePrompt,
} from "./batchPrompts";

assert.equal(
  resolveInteriorProcessingKind({
    enableSceneChange: true,
    enableInteriorSceneChange: true,
  }),
  "interior_scene",
);
assert.equal(
  resolveInteriorProcessingKind({
    enableSceneChange: true,
    enableInteriorSceneChange: true,
    enableInteriorClean: true,
  }),
  "interior_scene_clean",
);

const sceneAndCollage = planInteriorTasks(
  {
    enableSceneChange: true,
    enableInteriorSceneChange: true,
    enableInteriorCollage: true,
  },
  ["a", "b", "c", "d", "e"],
);
assert.equal(sceneAndCollage.processingItems.length, 5);
assert.deepEqual(
  sceneAndCollage.collageItems.map((item) => item.assetIds.length),
  [3, 2],
);

const collageOnly = planInteriorTasks(
  { enableInteriorCollage: true },
  ["a", "b"],
);
assert.equal(collageOnly.processingItems.length, 0);
assert.equal(collageOnly.collageItems.length, 1);

assert.match(batchInteriorScenePrompt, /第一张图片是车辆内饰原图/);
assert.match(batchInteriorScenePrompt, /第二张图片是本批次外观图共同使用的目标场景/);
assert.match(batchInteriorSceneCleanPrompt, /清除灰尘、污渍、油光和杂乱感/);
assert.match(batchInteriorCollagePrompt, /不要再次执行场景替换、清洁增强或内容重绘/);

console.log("batch interior workflow tests passed");
