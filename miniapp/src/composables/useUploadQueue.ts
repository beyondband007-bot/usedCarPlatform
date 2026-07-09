import type { UploadTask } from '@/types/upload'
import { UPLOAD_LIMITS } from '@/constants/upload'
import { uploadLotMedia, uploadVehicleMedia } from '@/services/upload'
import { useUploadStore } from '@/store/upload'
import { syncVehicleCaptureProgress } from '@/utils/vehicleProgress'

const activeTaskIds = new Set<string>()

function createTaskId() {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function errorText(error: unknown) {
  if (error instanceof Error)
    return error.message
  return '网络异常，请稍后重试'
}

export function useUploadQueue() {
  const uploadStore = useUploadStore()

  async function upload(task: UploadTask) {
    if (activeTaskIds.has(task.id))
      return
    activeTaskIds.add(task.id)
    uploadStore.updateTask(task.id, { status: 'uploading', progress: Math.max(1, task.progress), errorMessage: undefined })
    try {
      const uploadFn = task.ownerType === 'lot' ? uploadLotMedia : uploadVehicleMedia
      const result = await uploadFn({
        vehicleId: task.vehicleId,
        captureCode: task.captureCode,
        mediaType: task.mediaType || 'image',
        filePath: task.localPath,
        onProgress: progress => uploadStore.updateTask(task.id, { progress }),
      })
      uploadStore.updateTask(task.id, {
        ...result,
        id: task.id,
        status: 'success',
        progress: 100,
        remoteUrl: result.remoteUrl || (result as any).url,
        errorMessage: undefined,
      })
      if (task.ownerType !== 'lot')
        syncVehicleCaptureProgress(task.vehicleId)
    }
    catch (error) {
      const latest = uploadStore.queue.find(item => item.id === task.id)
      const retryCount = (latest?.retryCount || 0) + 1
      uploadStore.updateTask(task.id, {
        retryCount,
        status: retryCount <= UPLOAD_LIMITS.maxRetryCount ? 'waiting' : 'failed',
        progress: 0,
        errorMessage: errorText(error),
      })
    }
    finally {
      activeTaskIds.delete(task.id)
      processQueue()
    }
  }

  function reviveStaleUploadingTasks() {
    uploadStore.uploadingTasks
      .filter(task => !activeTaskIds.has(task.id))
      .forEach(task => uploadStore.updateTask(task.id, {
        status: 'waiting',
        progress: 0,
        errorMessage: undefined,
      }))
  }

  function processQueue() {
    reviveStaleUploadingTasks()
    const available = Math.max(0, uploadStore.concurrency - activeTaskIds.size)
    uploadStore.waitingTasks.slice(0, available).forEach(task => upload(task))
  }

  function enqueue(input: Pick<UploadTask, 'vehicleId' | 'captureCode' | 'localPath' | 'mediaType'> & Partial<UploadTask>) {
    const ownerType = input.ownerType || 'vehicle'
    const existing = uploadStore.queue.find(task =>
      task.vehicleId === input.vehicleId
      && (task.ownerType || 'vehicle') === ownerType
      && task.captureCode === input.captureCode
      && !['cancelled'].includes(task.status),
    )
    if (existing)
      uploadStore.removeTask(existing.id)

    const task: UploadTask = {
      id: input.id || createTaskId(),
      vehicleId: input.vehicleId,
      ownerType,
      captureCode: input.captureCode,
      mediaType: input.mediaType,
      localPath: input.localPath,
      fileName: input.fileName,
      fileSize: input.fileSize,
      progress: 0,
      retryCount: 0,
      status: 'waiting',
      createdAt: Date.now(),
    }
    uploadStore.addTask(task)
    processQueue()
    return task
  }

  function retry(id: string) {
    uploadStore.updateTask(id, {
      retryCount: 0,
      progress: 0,
      status: 'waiting',
      errorMessage: undefined,
    })
    processQueue()
  }

  function retryAll(vehicleId?: string) {
    uploadStore.failedTasks
      .filter(task => !vehicleId || task.vehicleId === vehicleId)
      .forEach(task => uploadStore.updateTask(task.id, {
        retryCount: 0,
        progress: 0,
        status: 'waiting',
        errorMessage: undefined,
      }))
    processQueue()
  }

  function cancel(id: string) {
    uploadStore.setTaskStatus(id, 'cancelled')
  }

  return {
    cancel,
    enqueue,
    processQueue,
    retry,
    retryAll,
    uploadStore,
  }
}
