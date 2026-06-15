import { getLocalVideoSceneTemplates } from '@/constants/video-generation-local-assets'
import type { VideoTemplate } from '@/types/video-generation'

export function getFallbackVideoTemplates(): VideoTemplate[] {
  return getLocalVideoSceneTemplates()
}
