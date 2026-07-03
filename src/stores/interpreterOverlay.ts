/**
 * 主持人同声传译会话的全局托管:
 *
 * - 会话状态从 Studio 组件搬到 store,切路由不销毁
 * - 支持最小化 → 悬浮 Widget 常驻在 BasicLayout,用户可去别的路由继续操作
 * - 会话结束/取消后 destroy(),下次进入 Studio 再重建
 */
import { computed, shallowRef, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  useInterpreterSession,
  type InterpreterSession,
} from '@/composables/useInterpreterSession'

export const useInterpreterOverlayStore = defineStore('interpreter-overlay', () => {
  /** 惰性创建的主持人 session;summary→再来一次时会被 destroy 后重建 */
  const session = shallowRef<InterpreterSession | null>(null)
  /** 是否已最小化(悬浮 Widget 是否显示) */
  const minimized = ref(false)

  /** 主持人 Studio 进入时确保 session 存在 */
  function ensureHostSession(): InterpreterSession {
    if (!session.value) {
      session.value = useInterpreterSession({ perspective: 'host' })
    }
    return session.value
  }

  /** 结束并清理(挂断到 summary → 再来一次 或用户离开工作台) */
  function destroy() {
    session.value?.dispose()
    session.value = null
    minimized.value = false
  }

  function minimize() {
    minimized.value = true
  }
  function expand() {
    minimized.value = false
  }

  /** 只在 share / call 阶段允许最小化;setup/summary 无意义 */
  const canMinimize = computed(() => {
    const view = session.value?.state.view
    return view === 'share' || view === 'call'
  })

  /** Widget 是否应当显示 */
  const showFloating = computed(() => minimized.value && canMinimize.value)

  return {
    session,
    minimized,
    canMinimize,
    showFloating,
    ensureHostSession,
    destroy,
    minimize,
    expand,
  }
})
