import { computed } from 'vue'
import { useRoute } from 'vue-router'

/** 仍使用旧版企业后台顶栏的路由（默认全部走首页同款顶栏） */
const LEGACY_CHROME_PATHS = new Set<string>()

export function isStudioChromePath(path: string) {
  return !LEGACY_CHROME_PATHS.has(path)
}

export function useStudioChrome() {
  const route = useRoute()

  const usesStudioChrome = computed(() => isStudioChromePath(route.path))

  return {
    usesStudioChrome,
  }
}
