import type { PaginationResult } from '@/types/api'
import { ref, shallowRef } from 'vue'

export function usePagination<T>(loader: (params: { page: number, pageSize: number }) => Promise<PaginationResult<T>>, pageSize = 10) {
  const list = shallowRef<T[]>([])
  const page = ref(1)
  const total = ref(0)
  const loading = ref(false)
  const finished = ref(false)
  const error = ref<unknown>()

  async function load(reset = false) {
    if (loading.value || (finished.value && !reset)) {
      return
    }

    loading.value = true
    error.value = undefined
    try {
      const nextPage = reset ? 1 : page.value
      const res = await loader({ page: nextPage, pageSize })
      list.value = reset ? res.list : [...list.value, ...res.list]
      total.value = res.total
      page.value = nextPage + 1
      finished.value = list.value.length >= res.total
    }
    catch (err) {
      error.value = err
      throw err
    }
    finally {
      loading.value = false
    }
  }

  function reset() {
    list.value = []
    page.value = 1
    total.value = 0
    finished.value = false
    error.value = undefined
  }

  return {
    error,
    finished,
    list,
    load,
    loading,
    page,
    reset,
    total,
  }
}
