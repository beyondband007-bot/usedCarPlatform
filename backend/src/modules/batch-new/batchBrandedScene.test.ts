import assert from "node:assert/strict";

import {
  isKieAccessibleSceneUrl,
  resolveBatchBrandedSceneInputUrl,
} from "./batchBrandedScene";

assert.equal(
  resolveBatchBrandedSceneInputUrl({
    url: "http://localhost:3101/results/batch-new-wall-logo-scene/result.png",
    sourceUrl: "https://tempfile.example.com/result.png",
  }),
  "https://tempfile.example.com/result.png",
);

assert.equal(
  resolveBatchBrandedSceneInputUrl({
    url: "https://cdn.example.com/result.png",
  }),
  "https://cdn.example.com/result.png",
);

assert.equal(
  resolveBatchBrandedSceneInputUrl({
    url: "http://127.0.0.1:3101/results/result.png",
  }),
  null,
);

assert.equal(isKieAccessibleSceneUrl("file:///tmp/result.png"), false);
assert.equal(isKieAccessibleSceneUrl("https://cdn.example.com/result.png"), true);

console.log("batch branded scene URL tests passed");
