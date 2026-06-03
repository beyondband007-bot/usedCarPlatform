import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { WorkspaceRecentItem } from '@/types/workspace'
import type { RecentGenerateModuleKey } from '@/utils/recent-generate-cache'

export interface RecentGenerateCacheEntry {
  taskList: WorkspaceRecentItem[]
  scrollTop: number
  lastFetchTime: number
}

function createEmptyEntry(): RecentGenerateCacheEntry {
  return {
    taskList: [],
    scrollTop: 0,
    lastFetchTime: 0,
  }
}

export const useRecentGenerateStore = defineStore('recentGenerate', () => {
  const caches = ref<Record<RecentGenerateModuleKey, RecentGenerateCacheEntry>>(
    {
      showroom: createEmptyEntry(),
      outdoor: createEmptyEntry(),
      motion: createEmptyEntry(),
      sky: createEmptyEntry(),
      polish: createEmptyEntry(),
      clean: createEmptyEntry(),
      batch: createEmptyEntry(),
      delivery: createEmptyEntry(),
    },
  )

  const returningFromDetail = ref<Record<RecentGenerateModuleKey, boolean>>({
    showroom: false,
    outdoor: false,
    motion: false,
    sky: false,
    polish: false,
    clean: false,
    batch: false,
    delivery: false,
  })

  function getCache(key: RecentGenerateModuleKey) {
    return caches.value[key]
  }

  function setTaskList(key: RecentGenerateModuleKey, taskList: WorkspaceRecentItem[]) {
    caches.value[key] = {
      ...caches.value[key],
      taskList: [...taskList],
      lastFetchTime: Date.now(),
    }
  }

  function patchTaskList(
    key: RecentGenerateModuleKey,
    taskList: WorkspaceRecentItem[],
    options?: { touchFetchTime?: boolean },
  ) {
    caches.value[key] = {
      ...caches.value[key],
      taskList: [...taskList],
      lastFetchTime:
        options?.touchFetchTime === false
          ? caches.value[key].lastFetchTime
          : Date.now(),
    }
  }

  function setScrollTop(key: RecentGenerateModuleKey, scrollTop: number) {
    caches.value[key] = {
      ...caches.value[key],
      scrollTop: Math.max(0, scrollTop),
    }
  }

  function markReturningFromDetail(key: RecentGenerateModuleKey) {
    returningFromDetail.value[key] = true
  }

  function consumeReturningFromDetail(key: RecentGenerateModuleKey) {
    const returning = returningFromDetail.value[key]
    returningFromDetail.value[key] = false
    return returning
  }

  function isCacheStale(key: RecentGenerateModuleKey, staleMs: number) {
    const entry = caches.value[key]
    if (!entry.lastFetchTime) return true
    return Date.now() - entry.lastFetchTime > staleMs
  }

  return {
    caches,
    getCache,
    setTaskList,
    patchTaskList,
    setScrollTop,
    markReturningFromDetail,
    consumeReturningFromDetail,
    isCacheStale,
  }
})
