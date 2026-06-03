import type { WorkspaceCapabilityKind } from '@/types/workspace'

export type RecentGenerateModuleKey =
  | 'showroom'
  | 'outdoor'
  | 'motion'
  | 'sky'
  | 'polish'
  | 'clean'
  | 'batch'
  | 'delivery'

const capabilityCodeToCacheKey: Record<string, RecentGenerateModuleKey> = {
  'showroom-light': 'showroom',
  'outdoor-scene': 'outdoor',
  'road-motion': 'motion',
  'sky-studio': 'sky',
  'paint-refresh': 'polish',
  'light-consistency': 'polish',
  'interior-clean': 'clean',
  'interior-stitch': 'clean',
  'watermark-remove': 'clean',
  'batch-new': 'batch',
  delivery: 'delivery',
}

export function resolveRecentGenerateCacheKey(input: {
  capabilityCode: string
  capabilityKind?: WorkspaceCapabilityKind
}): RecentGenerateModuleKey | null {
  if (input.capabilityKind === 'delivery') return 'delivery'
  return capabilityCodeToCacheKey[input.capabilityCode] ?? null
}

export const RECENT_GENERATE_STALE_MS = 30_000
