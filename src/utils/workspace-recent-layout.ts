import type { CSSProperties } from 'vue'

import { resolveRecentPlaceholderAspectRatio } from '@/utils/workspace-recent'
import type { WorkspaceRecentItem } from '@/types/workspace'

export type RecentRatioType = '1-1' | '3-4' | '4-3' | '9-16' | '16-9'
export type RecentDisplayGroup = 'landscape' | 'square' | 'portrait'

const RATIO_TYPE_VALUES: Array<{ type: RecentRatioType; value: number }> = [
  { type: '16-9', value: 16 / 9 },
  { type: '4-3', value: 4 / 3 },
  { type: '1-1', value: 1 },
  { type: '3-4', value: 3 / 4 },
  { type: '9-16', value: 9 / 16 },
]

export function resolveMasonryGridColumns(width: number): number {
  if (width >= 760) return 4
  if (width >= 520) return 3
  return 2
}

export function estimateRecentHeightRatio(
  item: Pick<WorkspaceRecentItem, 'outputRatio' | 'imageWidth' | 'imageHeight'>,
): number {
  const group = resolveRecentDisplayGroup(item)
  if (group === 'landscape') return 9 / 16
  if (group === 'square') return 1
  return 16 / 9
}

export function distributeMasonryColumns<T>(
  items: T[],
  columnCount: number,
  estimateHeight: (item: T) => number,
): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => [])
  const heights = new Array(columnCount).fill(0)

  for (const item of items) {
    const minIndex = heights.indexOf(Math.min(...heights))
    columns[minIndex].push(item)
    heights[minIndex] += estimateHeight(item)
  }

  return columns
}

export function resolveRecentRatioType(
  item: Pick<WorkspaceRecentItem, 'outputRatio' | 'imageWidth' | 'imageHeight'>,
): RecentRatioType {
  const cssRatio = resolveRecentPlaceholderAspectRatio(item)
  const [rawW, rawH] = cssRatio.split('/').map((part) => Number(part.trim()))

  if (!rawW || !rawH) {
    return '3-4'
  }

  const current = rawW / rawH
  let matched = RATIO_TYPE_VALUES[0]

  for (const candidate of RATIO_TYPE_VALUES) {
    if (
      Math.abs(Math.log(current / candidate.value)) <
      Math.abs(Math.log(current / matched.value))
    ) {
      matched = candidate
    }
  }

  return matched.type
}

export function resolveRecentDisplayGroup(
  item: Pick<WorkspaceRecentItem, 'outputRatio' | 'imageWidth' | 'imageHeight'>,
): RecentDisplayGroup {
  const type = resolveRecentRatioType(item)
  if (type === '16-9' || type === '4-3') return 'landscape'
  if (type === '1-1') return 'square'
  return 'portrait'
}

export function resolveRecentFlowClass(item: WorkspaceRecentItem) {
  return [`recent-card--ratio-${resolveRecentRatioType(item)}`]
}

export function resolveRecentFlowMediaStyle(
  item: Pick<WorkspaceRecentItem, 'outputRatio' | 'imageWidth' | 'imageHeight'>,
): CSSProperties {
  return {
    aspectRatio: resolveRecentPlaceholderAspectRatio(item),
  }
}

function violatesPlacementRules(
  result: WorkspaceRecentItem[],
  candidate: WorkspaceRecentItem,
) {
  const type = resolveRecentRatioType(candidate)
  const group = resolveRecentDisplayGroup(candidate)
  const total = result.length

  if (total >= 1 && type === '16-9') {
    if (resolveRecentRatioType(result[total - 1]) === '16-9') {
      return true
    }
  }

  if (total >= 1 && type === '9-16') {
    if (resolveRecentRatioType(result[total - 1]) === '9-16') {
      return true
    }
  }

  if (total >= 2 && group === 'portrait') {
    const previousGroup = resolveRecentDisplayGroup(result[total - 1])
    const beforePreviousGroup = resolveRecentDisplayGroup(result[total - 2])
    if (previousGroup === 'portrait' && beforePreviousGroup === 'portrait') {
      return true
    }
  }

  return false
}

function pickCandidate(
  pools: Record<RecentDisplayGroup, WorkspaceRecentItem[]>,
  result: WorkspaceRecentItem[],
  preferred: RecentDisplayGroup,
  strict: boolean,
) {
  const groups: RecentDisplayGroup[] = [
    preferred,
    ...(['landscape', 'portrait', 'square'] as const).filter(
      (group) => group !== preferred,
    ),
  ]

  for (const group of groups) {
    const pool = pools[group]
    for (let index = 0; index < pool.length; index += 1) {
      const candidate = pool[index]
      if (!strict || !violatesPlacementRules(result, candidate)) {
        pool.splice(index, 1)
        return candidate
      }
    }
  }

  return null
}

export function normalizeDisplayOrder(items: WorkspaceRecentItem[]) {
  if (items.length <= 1) {
    return [...items]
  }

  const pools: Record<RecentDisplayGroup, WorkspaceRecentItem[]> = {
    landscape: [],
    square: [],
    portrait: [],
  }

  for (const item of items) {
    pools[resolveRecentDisplayGroup(item)].push(item)
  }

  const result: WorkspaceRecentItem[] = []
  const openingPattern: RecentDisplayGroup[] = ['landscape', 'portrait', 'square']

  for (const group of openingPattern) {
    const picked = pickCandidate(pools, result, group, true)
    if (picked) {
      result.push(picked)
    }
  }

  const cyclePattern: RecentDisplayGroup[] = ['landscape', 'portrait', 'square']

  while (
    pools.landscape.length + pools.portrait.length + pools.square.length >
    0
  ) {
    let placed = false

    for (const group of cyclePattern) {
      const picked = pickCandidate(pools, result, group, true)
      if (picked) {
        result.push(picked)
        placed = true
      }
    }

    if (!placed) {
      for (const group of cyclePattern) {
        const picked = pickCandidate(pools, result, group, false)
        if (picked) {
          result.push(picked)
          placed = true
          break
        }
      }
    }

    if (!placed) {
      break
    }
  }

  for (const group of cyclePattern) {
    result.push(...pools[group])
    pools[group] = []
  }

  return result
}
