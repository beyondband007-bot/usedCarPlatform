import digitalHumanBasementImg from '@/assets/img/数字人/数字人1地库.png'
import digitalHumanOutdoorImg from '@/assets/img/数字人/数字人2室外.png'
import sceneBasementVideo from '@/assets/video/场景1地库.mp4'
import sceneOutdoorVideo from '@/assets/video/场景2室外.mp4'
import { VIDEO_DURATION_SECONDS } from '@/constants/short-video'
import type { DigitalHuman, VideoTemplate, VideoTemplateType } from '@/types/video-generation'

export const localSceneBasementVideo = sceneBasementVideo
export const localSceneOutdoorVideo = sceneOutdoorVideo

export const localDigitalHumanBasementImg = digitalHumanBasementImg
export const localDigitalHumanOutdoorImg = digitalHumanOutdoorImg

interface LocalSceneDefinition {
  key: string
  title: string
  type: VideoTemplateType
  typeLabel: string
  styleLabel: string
  stylePrompt: string
  badge: VideoTemplate['badge']
  videoUrl: string
  posterUrl: string
  /** 对应后端 digital-humans.json 中的真实 id，仅用于提交任务 */
  backendDigitalHumanId: string
  digitalHuman: Omit<DigitalHuman, 'id'>
  fallbackTemplateId: string
}

const LOCAL_SCENE_DEFINITIONS: LocalSceneDefinition[] = [
  {
    key: 'basement',
    title: '地库光影场景',
    type: 'dealership',
    typeLabel: '地库场景',
    styleLabel: '专业讲解',
    stylePrompt: '地下车库均匀柔光，突出车身线条与漆面质感，适合精品车源口播展示。',
    badge: 'hot',
    videoUrl: sceneBasementVideo,
    posterUrl: digitalHumanBasementImg,
    fallbackTemplateId: 'local-scene-basement',
    backendDigitalHumanId: 'dh-female-01',
    digitalHuman: {
      name: '主播 · 地库',
      gender: 'female',
      ageStyle: '地库场景 · 沉稳专业',
      previewUrl: digitalHumanBasementImg,
      imageUrl: digitalHumanBasementImg,
      voiceStatus: 'ready',
    },
  },
  {
    key: 'outdoor',
    title: '室外自然光场景',
    type: 'single-car',
    typeLabel: '室外场景',
    styleLabel: '口播出镜',
    stylePrompt: '户外自然光环境，画面通透有层次，适合动感车型与促销口播讲解。',
    badge: null,
    videoUrl: sceneOutdoorVideo,
    posterUrl: digitalHumanOutdoorImg,
    fallbackTemplateId: 'local-scene-outdoor',
    backendDigitalHumanId: 'dh-female-02',
    digitalHuman: {
      name: '主播 · 室外',
      gender: 'female',
      ageStyle: '室外场景 · 亲和自然',
      previewUrl: digitalHumanOutdoorImg,
      imageUrl: digitalHumanOutdoorImg,
      voiceStatus: 'ready',
    },
  },
]

function buildLocalSceneTemplate(
  scene: LocalSceneDefinition,
  apiTemplate?: VideoTemplate,
): VideoTemplate {
  return {
    id: apiTemplate?.id ?? scene.fallbackTemplateId,
    templateId: apiTemplate?.templateId ?? scene.fallbackTemplateId,
    referenceMaterialId: apiTemplate?.referenceMaterialId,
    title: scene.title,
    type: scene.type,
    typeLabel: scene.typeLabel,
    style: apiTemplate?.style ?? 'professional',
    styleLabel: scene.styleLabel,
    badge: scene.badge,
    thumbnailUrl: scene.posterUrl,
    previewUrl: scene.videoUrl,
    stylePrompt: scene.stylePrompt,
    durationSeconds: apiTemplate?.durationSeconds ?? VIDEO_DURATION_SECONDS,
    outputRatio: apiTemplate?.outputRatio ?? '9:16',
    videoResolution: apiTemplate?.videoResolution ?? '720p',
    inputRequirements: apiTemplate?.inputRequirements ?? [],
    requiredFields: apiTemplate?.requiredFields ?? [],
    optionalFields: apiTemplate?.optionalFields ?? [],
    status: 'available',
    generationReadiness: 'ready',
  }
}

function findApiTemplateForScene(
  scene: LocalSceneDefinition,
  apiTemplates: VideoTemplate[],
  usedTemplateIds: Set<string>,
) {
  const preferred = apiTemplates.find(
    (item) =>
      item.type === scene.type &&
      item.status !== 'coming_soon' &&
      item.generationReadiness !== 'unavailable' &&
      !usedTemplateIds.has(item.templateId),
  )
  if (preferred) return preferred

  return apiTemplates.find(
    (item) =>
      item.status !== 'coming_soon' &&
      item.generationReadiness !== 'unavailable' &&
      item.type !== 'market' &&
      !usedTemplateIds.has(item.templateId),
  )
}

/** 仅保留地库 / 室外两个本地场景模板，并尽量复用后端 templateId */
export function getLocalVideoSceneTemplates(apiTemplates: VideoTemplate[] = []): VideoTemplate[] {
  const usedTemplateIds = new Set<string>()

  return LOCAL_SCENE_DEFINITIONS.map((scene) => {
    const apiTemplate = findApiTemplateForScene(scene, apiTemplates, usedTemplateIds)
    if (apiTemplate) {
      usedTemplateIds.add(apiTemplate.templateId)
    }
    return buildLocalSceneTemplate(scene, apiTemplate)
  })
}

function findApiHumanForScene(
  scene: LocalSceneDefinition,
  apiHumans: DigitalHuman[],
  usedHumanIds: Set<string>,
) {
  const byConfiguredId = apiHumans.find(
    (item) => item.id === scene.backendDigitalHumanId && !usedHumanIds.has(item.id),
  )
  if (byConfiguredId) return byConfiguredId

  return apiHumans.find((item) => !usedHumanIds.has(item.id))
}

/** 使用本地数字人形象展示，提交时始终走后端真实 digitalHumanId */
export function getLocalDigitalHumans(apiHumans: DigitalHuman[] = []): DigitalHuman[] {
  const usedHumanIds = new Set<string>()

  return LOCAL_SCENE_DEFINITIONS.map((scene) => {
    const localHuman = scene.digitalHuman
    const apiHuman = findApiHumanForScene(scene, apiHumans, usedHumanIds)
    if (apiHuman) {
      usedHumanIds.add(apiHuman.id)
      return {
        ...apiHuman,
        name: localHuman.name,
        gender: localHuman.gender,
        ageStyle: localHuman.ageStyle,
        previewUrl: localHuman.previewUrl,
        imageUrl: localHuman.previewUrl,
      }
    }

    return {
      id: scene.backendDigitalHumanId,
      ...localHuman,
      voiceStatus: 'not_configured',
    }
  })
}

export function isLocalOnlyDigitalHumanId(digitalHumanId: string) {
  return digitalHumanId.startsWith('local-dh-')
}

export function getLocalScenePreviewById(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const scene of LOCAL_SCENE_DEFINITIONS) {
    map[scene.fallbackTemplateId] = scene.videoUrl
  }
  return map
}

export function getLocalScenePreviewByType(): Partial<Record<VideoTemplateType, string>> {
  return {
    dealership: sceneBasementVideo,
    'single-car': sceneOutdoorVideo,
  }
}
