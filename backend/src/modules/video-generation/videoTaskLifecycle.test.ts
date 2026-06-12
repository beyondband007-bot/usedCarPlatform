import assert from "node:assert/strict";

import type { GenerationTaskRecord } from "../tasks/tasksRepository";
import { tasksRepository } from "../tasks/tasksRepository";
import { tasksService } from "../tasks/tasksService";
import { videoGenerationService } from "./videoGenerationService";

const now = new Date();
let currentTask: GenerationTaskRecord = {
  id: "task_video_contract",
  userId: "user_contract",
  moduleCode: "video-generation",
  status: "queued",
  progress: 5,
  inputAssetId: "asset_exterior_01",
  optionId: "video_script_contract",
  outputRatio: "9:16",
  resolution: "720p",
  kieTaskId: "kie_video_contract",
  kieAccountHash: "account_contract",
  attemptCount: 1,
  pollFailureCount: 0,
  createdAt: now,
  updatedAt: now,
};

const originalFindById = tasksRepository.findById.bind(tasksRepository);
const originalMarkCanceled =
  tasksRepository.markCanceled.bind(tasksRepository);
const originalListKieTaskRecords =
  tasksRepository.listKieTaskRecords.bind(tasksRepository);
const originalCreateVideoTask =
  videoGenerationService.createVideoTask.bind(videoGenerationService);

tasksRepository.findById = (async (id: string, userId?: string) =>
  id === currentTask.id &&
  (!userId || userId === currentTask.userId)
    ? currentTask
    : null) as typeof tasksRepository.findById;
tasksRepository.markCanceled = (async (
  id: string,
  errorCode: string,
  errorMessage: string,
) => {
  assert.equal(id, currentTask.id);
  currentTask = {
    ...currentTask,
    status: "canceled",
    progress: 100,
    errorCode,
    errorMessage,
    updatedAt: new Date(),
  };
}) as typeof tasksRepository.markCanceled;
tasksRepository.listKieTaskRecords = (async () =>
  []) as typeof tasksRepository.listKieTaskRecords;

const run = async () => {
  const canceled = await tasksService.cancelTask(
    currentTask.id,
    currentTask.userId,
    { moduleCode: "video-generation" },
  );
  assert.equal(canceled.status, "canceled");
  assert.equal(canceled.workflowStage, "canceled");
  assert.equal(canceled.canCancel, false);
  assert.equal(canceled.scriptDraftId, "video_script_contract");
  assert.equal(canceled.cancellation.accepted, true);
  assert.equal(
    canceled.cancellation.upstreamCancellationSupported,
    false,
  );

  const detail = await tasksService.getTaskDetail(currentTask.id, {
    userId: currentTask.userId,
  });
  assert.equal(detail.status, "canceled");
  assert.equal(detail.pollingRecommendedMs, null);

  await assert.rejects(
    () =>
      tasksService.cancelTask(currentTask.id, currentTask.userId, {
        moduleCode: "video-generation",
      }),
    /terminal status/,
  );

  videoGenerationService.createVideoTask = (async (
    body: { scriptDraftId?: unknown },
    userId: string,
  ) => {
    assert.equal(body.scriptDraftId, "video_script_contract");
    assert.equal(userId, currentTask.userId);
    return {
      taskId: "task_video_regenerated",
      scriptDraftId: body.scriptDraftId,
      moduleCode: "video-generation",
      status: "queued",
      progress: 5,
    } as Awaited<
      ReturnType<typeof videoGenerationService.createVideoTask>
    >;
  }) as typeof videoGenerationService.createVideoTask;

  const regenerated =
    await videoGenerationService.regenerateVideoTask(
      currentTask.id,
      currentTask.userId,
    );
  assert.equal(regenerated.taskId, "task_video_regenerated");
  assert.equal(regenerated.scriptDraftId, "video_script_contract");
  assert.equal(regenerated.regeneratedFromTaskId, currentTask.id);

  console.log(
    JSON.stringify(
      {
        runId: "video-task-lifecycle-20260611-01",
        workflowStage: canceled.workflowStage,
        canCancel: canceled.canCancel,
        historyScriptDraftId: canceled.scriptDraftId,
        upstreamCancellationSupported:
          canceled.cancellation.upstreamCancellationSupported,
        regeneratedTaskId: regenerated.taskId,
        regeneratedFromTaskId: regenerated.regeneratedFromTaskId,
        status: "passed",
      },
      null,
      2,
    ),
  );
};

run()
  .finally(() => {
    tasksRepository.findById = originalFindById;
    tasksRepository.markCanceled = originalMarkCanceled;
    tasksRepository.listKieTaskRecords = originalListKieTaskRecords;
    videoGenerationService.createVideoTask = originalCreateVideoTask;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
