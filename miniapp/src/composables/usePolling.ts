import { onBeforeUnmount, ref } from 'vue'

export function usePolling(task: () => Promise<void> | void, interval = 3000) {
  const polling = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  async function run() {
    if (!polling.value) {
      return
    }
    await task()
    if (polling.value) {
      timer = setTimeout(run, interval)
    }
  }

  function start() {
    if (polling.value) {
      return
    }
    polling.value = true
    run()
  }

  function stop() {
    polling.value = false
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  onBeforeUnmount(stop)

  return {
    polling,
    start,
    stop,
  }
}
