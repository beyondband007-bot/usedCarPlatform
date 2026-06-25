import {
  VIDEO_OUTPUT_RATIO,
  VIDEO_RESOLUTION,
  formatVideoOutputRatioLabel,
  resolveVideoPreviewSize,
} from '@/constants/short-video'
import type { WorkspaceGenerateResult } from '@/types/workspace'
import type { VideoGenerationTask } from '@/types/video-generation'
import { formatDate } from '@/utils/dayjs'

export function resolveVideoTaskMediaUrl(task: VideoGenerationTask) {
  const videoItem = task.resultVideos?.[0]
  return (
    videoItem?.url ??
    videoItem?.downloadUrl ??
    task.previewVideo ??
    task.videoUrl ??
    task.downloadUrl ??
    task.resultImages?.[0]?.url ??
    ''
  )
}

export function resolveVideoTaskDownloadUrl(task: VideoGenerationTask) {
  const videoItem = task.resultVideos?.[0]
  return (
    videoItem?.downloadUrl ??
    task.downloadUrl ??
    videoItem?.url ??
    task.previewVideo ??
    task.videoUrl ??
    ''
  )
}

export function resolveVideoTaskOutputRatio(task: VideoGenerationTask) {
  return task.outputRatio ?? VIDEO_OUTPUT_RATIO
}

export function resolveVideoTaskResolution(task: VideoGenerationTask) {
  return task.resolution ?? VIDEO_RESOLUTION
}

export function buildVideoTaskRatioLabel(task: VideoGenerationTask) {
  return formatVideoOutputRatioLabel(
    resolveVideoTaskOutputRatio(task),
    resolveVideoTaskResolution(task),
  )
}

export function buildWorkspaceResultFromVideoTask(
  task: VideoGenerationTask,
): WorkspaceGenerateResult | null {
  const videoUrl = resolveVideoTaskMediaUrl(task)
  if (!videoUrl) return null

  const videoItem = task.resultVideos?.[0]
  const title = task.title ?? '短视频生成'
  const outputRatio = resolveVideoTaskOutputRatio(task)
  const previewSize = resolveVideoPreviewSize(
    outputRatio,
    videoItem?.width,
    videoItem?.height,
  )

  return {
    createdAt: formatDate(task.updatedAt ?? task.createdAt ?? new Date()),
    statusText: `已完成 · ${title} · 短视频生成结果`,
    ratioLabel: buildVideoTaskRatioLabel(task),
    mediaType: 'video',
    previewImage: videoItem?.thumbnail ?? videoItem?.thumbnailUrl ?? task.thumbnail ?? '',
    previewVideo: videoUrl,
    previewAlt: `${title}生成结果`,
    downloadUrl: resolveVideoTaskDownloadUrl(task) || videoUrl,
    resultImages: task.resultImages ?? [],
    taskId: task.taskId,
    imageWidth: previewSize.width,
    imageHeight: previewSize.height,
  }
}
