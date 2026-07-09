import type { UploadStatus, UploadTask } from '@/types/upload'
import { UPLOAD_LIMITS } from '@/constants/upload'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useUploadStore = defineStore(
  'upload',
  () => {
    const queue = ref<UploadTask[]>([])
    const concurrency = ref(UPLOAD_LIMITS.concurrency)

    const waitingTasks = computed(() => queue.value.filter(task => task.status === 'waiting'))
    const uploadingTasks = computed(() => queue.value.filter(task => task.status === 'uploading'))
    const failedTasks = computed(() => queue.value.filter(task => task.status === 'failed'))
    const unfinishedTasks = computed(() => queue.value.filter(task => !['success', 'cancelled'].includes(task.status)))

    function addTask(task: UploadTask) {
      const index = queue.value.findIndex(item => item.id === task.id)
      if (index >= 0) {
        queue.value.splice(index, 1, task)
        return
      }
      queue.value.push(task)
    }

    function updateTask(id: string, patch: Partial<UploadTask>) {
      const task = queue.value.find(item => item.id === id)
      if (!task) {
        return
      }
      Object.assign(task, patch)
    }

    function removeTask(id: string) {
      queue.value = queue.value.filter(item => item.id !== id)
    }

    function setTaskStatus(id: string, status: UploadStatus, errorMessage?: string) {
      updateTask(id, { status, errorMessage })
    }

    function clearCompleted() {
      queue.value = queue.value.filter(task => task.status !== 'success')
    }

    function resetUploadState() {
      queue.value = []
      concurrency.value = UPLOAD_LIMITS.concurrency
    }

    return {
      addTask,
      clearCompleted,
      concurrency,
      failedTasks,
      queue,
      removeTask,
      resetUploadState,
      setTaskStatus,
      unfinishedTasks,
      updateTask,
      uploadingTasks,
      waitingTasks,
    }
  },
  {
    persist: true,
  },
)
