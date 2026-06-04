import assert from "node:assert/strict";

import { batchRepository } from "../batch-new/batchRepository";
import { deliveryRepository } from "../delivery/deliveryRepository";
import { tasksRepository } from "./tasksRepository";

type CapturedQuery = {
  sql: string;
  params?: Record<string, unknown>;
};

const captureQueries = (repository: object) => {
  const calls: CapturedQuery[] = [];
  const original = (repository as any).query;
  const originalExecute = (repository as any).execute;
  (repository as any).query = async (sql: string, params?: Record<string, unknown>) => {
    calls.push({ sql, params });
    if (sql.includes("COUNT(*)")) return [{ total: 0 }];
    return [];
  };
  (repository as any).execute = async (sql: string, params?: Record<string, unknown>) => {
    calls.push({ sql, params });
    return {};
  };
  return {
    calls,
    restore: () => {
      (repository as any).query = original;
      (repository as any).execute = originalExecute;
    },
  };
};

const assertHasUserFilter = (call: CapturedQuery, expectedUserId = "user_a") => {
  assert.match(call.sql, /user_id\s*=\s*:userId/);
  assert.equal(call.params?.userId, expectedUserId);
};

async function testTaskQueriesUseUserFilter() {
  const captured = captureQueries(tasksRepository);
  try {
    await tasksRepository.findById("task_1", "user_a");
    assertHasUserFilter(captured.calls[0]);

    await tasksRepository.listRecent({
      userId: "user_a",
      moduleCode: "creative-image",
      page: 1,
      pageSize: 20,
    });
    assertHasUserFilter(captured.calls[1]);
    assertHasUserFilter(captured.calls[2]);

    await tasksRepository.createWaitingTask({
      id: "task_new",
      userId: "user_a",
      moduleCode: "creative-image",
      outputRatio: "1:1",
      resolution: "2K",
      prompt: "test",
    });
    assert.match(captured.calls[3].sql, /INSERT INTO generation_tasks\s*\([\s\S]*user_id/);
    assert.equal(captured.calls[3].params?.userId, "user_a");
  } finally {
    captured.restore();
  }
}

async function testBatchQueriesUseUserFilter() {
  const captured = captureQueries(batchRepository);
  try {
    await batchRepository.findBatch("batch_1", "user_a");
    assertHasUserFilter(captured.calls[0]);

    await batchRepository.listBatches({ userId: "user_a", page: 1, pageSize: 20 });
    assertHasUserFilter(captured.calls[1]);
    assertHasUserFilter(captured.calls[2]);
  } finally {
    captured.restore();
  }
}

async function testDeliveryAssetsJoinBatchOwner() {
  const captured = captureQueries(deliveryRepository);
  try {
    await deliveryRepository.findAssetsByIds(["delivery_1"], "user_a");
    assert.match(captured.calls[0].sql, /JOIN batch_tasks bt ON bt\.id = da\.source_task_id/);
    assertHasUserFilter(captured.calls[0]);
  } finally {
    captured.restore();
  }
}

async function run() {
  await testTaskQueriesUseUserFilter();
  await testBatchQueriesUseUserFilter();
  await testDeliveryAssetsJoinBatchOwner();
  console.log("user isolation repository tests passed");
}

void run();
