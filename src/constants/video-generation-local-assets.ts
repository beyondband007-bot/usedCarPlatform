import messageDh01 from '@/assets/img/video-generation/message-dh-01.png'
import messageDh02 from '@/assets/img/video-generation/message-dh-02.jpg'
import messageDh03 from '@/assets/img/video-generation/message-dh-03.jpg'
import messageDh04 from '@/assets/img/video-generation/message-dh-04.png'
import scene01Video from '@/assets/video/video-generation/message-scene-01-dealership.mp4'
import scene02Video from '@/assets/video/video-generation/message-scene-02-dealership.mp4'
import scene03Video from '@/assets/video/video-generation/message-scene-03-dealership.mp4'
import scene04Video from '@/assets/video/video-generation/message-scene-04-single-car.mp4'
import scene05Video from '@/assets/video/video-generation/message-scene-05-market-info.mp4'
import { VIDEO_DURATION_SECONDS } from '@/constants/short-video'
import type { DigitalHuman, VideoTemplate, VideoTemplateType } from '@/types/video-generation'

interface LocalSceneDefinition {
  templateId: string
  title: string
  type: VideoTemplateType
  typeLabel: string
  styleLabel: string
  stylePrompt: string
  description: string
  badge: VideoTemplate['badge']
  videoUrl: string
}

const LOCAL_SCENE_DEFINITIONS: LocalSceneDefinition[] = [
  {
    templateId: 'ref-video-001',
    title: '车场介绍 1｜开场总览',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '真实导览',
    stylePrompt: '真实二手车车场介绍风格，先建立场地环境，再切入车辆陈列和到店看车氛围。',
    description: '用于介绍门店环境、车场规模和到店看车氛围，适合作为车场介绍开场。',
    badge: 'hot',
    videoUrl: scene01Video,
  },
  {
    templateId: 'ref-video-002',
    title: '车场介绍 2｜销售导览',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '销售导览',
    stylePrompt: '销售顾问式车场导览风格，围绕场地、车辆陈列和服务体验组织镜头。',
    description: '以销售顾问口吻带看车场，突出车辆陈列、接待动线和真实服务感。',
    badge: null,
    videoUrl: scene02Video,
  },
  {
    templateId: 'ref-video-003',
    title: '车场介绍 3｜库存展示',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '库存展示',
    stylePrompt: '多车库存展示风格，强调车辆排列、场地规模和重点车源导入。',
    description: '适合展示多台车源和库存规模，再自然引出主推车型或重点车辆。',
    badge: null,
    videoUrl: scene03Video,
  },
  {
    templateId: 'ref-video-004',
    title: '单车品介绍｜实车讲解',
    type: 'single-car',
    typeLabel: '单车品介绍',
    styleLabel: '实车讲解',
    stylePrompt: '单车品介绍风格，围绕一台车完成外观、内饰、空间和使用场景的 8-15 秒短口播介绍。',
    description: '聚焦单台车辆，按外观、内饰、空间和使用场景完成短节奏讲解。',
    badge: 'hot',
    videoUrl: scene04Video,
  },
  {
    templateId: 'ref-video-005',
    title: '车辆广告｜动态展示',
    type: 'vehicle-ad',
    typeLabel: '车辆广告',
    styleLabel: '暂未开放',
    stylePrompt: '车辆广告模板暂未开放，敬请期待。',
    description: '适合用车辆动态镜头制作广告展示，当前模板暂未开放。',
    badge: 'new',
    videoUrl: scene05Video,
  },
]

const LOCAL_DIGITAL_HUMANS: DigitalHuman[] = [
  {
    id: 'dh-message-01',
    name: '数字人 1｜亲和女声',
    gender: 'female',
    ageStyle: '年轻女性 · 预设音色 Friendly Paige',
    previewUrl: messageDh01,
    imageUrl: messageDh01,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-02',
    name: '数字人 2｜专业男声',
    gender: 'male',
    ageStyle: '年轻男性 · 预设音色 博学讲师',
    previewUrl: messageDh02,
    imageUrl: messageDh02,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-03',
    name: '数字人 3｜明亮女声',
    gender: 'female',
    ageStyle: '年轻女性 · 预设音色 Bright Queen',
    previewUrl: messageDh03,
    imageUrl: messageDh03,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-04',
    name: '数字人 4｜活力女声',
    gender: 'female',
    ageStyle: '年轻女性 · 预设音色 EngagingGirl',
    previewUrl: messageDh04,
    imageUrl: messageDh04,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
]

function buildFallbackSceneTemplate(scene: LocalSceneDefinition): VideoTemplate {
  return {
    id: scene.templateId,
    templateId: scene.templateId,
    referenceMaterialId: scene.templateId,
    title: scene.title,
    type: scene.type,
    typeLabel: scene.typeLabel,
    style: 'professional',
    styleLabel: scene.styleLabel,
    badge: scene.badge,
    description: scene.description,
    thumbnailUrl: scene.videoUrl,
    previewUrl: scene.videoUrl,
    stylePrompt: scene.stylePrompt,
    durationSeconds: VIDEO_DURATION_SECONDS,
    durationLabel: '≤00:15',
    outputRatio: '9:16',
    videoResolution: '720p',
    inputRequirements: [],
    requiredFields: [],
    optionalFields: [],
    status: scene.type === 'vehicle-ad' ? 'coming_soon' : 'available',
    generationReadiness: scene.type === 'vehicle-ad' ? 'unavailable' : 'ready',
    reason: scene.type === 'vehicle-ad' ? '该模板暂未开放，敬请期待！' : undefined,
  }
}

export function getLocalVideoSceneTemplates(apiTemplates: VideoTemplate[] = []): VideoTemplate[] {
  if (apiTemplates.length) {
    return apiTemplates.map((template) => {
      const local = localSceneDefinitionById[template.templateId]
      if (!local) return template

      return {
        ...template,
        title: local.title,
        type: local.type,
        typeLabel: local.typeLabel,
        styleLabel: local.styleLabel,
        description: local.description,
        stylePrompt: local.stylePrompt,
        scenePrompt: template.scenePrompt ?? local.stylePrompt,
        thumbnailUrl: local.videoUrl,
        previewUrl: local.videoUrl,
        status: local.type === 'vehicle-ad' ? 'coming_soon' : template.status,
        generationReadiness:
          local.type === 'vehicle-ad' ? 'unavailable' : template.generationReadiness,
        reason: local.type === 'vehicle-ad' ? '该模板暂未开放，敬请期待！' : template.reason,
      }
    })
  }

  return LOCAL_SCENE_DEFINITIONS.map(buildFallbackSceneTemplate)
}

export function getLocalDigitalHumans(apiHumans: DigitalHuman[] = []): DigitalHuman[] {
  if (apiHumans.length) {
    return apiHumans.map((human) => ({
      ...human,
      ...localDigitalHumanDisplayById[human.id],
      previewUrl: localDigitalHumanDisplayById[human.id]?.previewUrl ?? human.previewUrl,
      imageUrl: localDigitalHumanDisplayById[human.id]?.imageUrl ?? human.imageUrl,
    }))
  }
  return LOCAL_DIGITAL_HUMANS
}

export function isLocalOnlyDigitalHumanId(digitalHumanId: string) {
  return digitalHumanId.startsWith('local-dh-')
}

export const localTemplatePreviewById: Record<string, string> = Object.fromEntries(
  LOCAL_SCENE_DEFINITIONS.map((scene) => [scene.templateId, scene.videoUrl]),
)

const localSceneDefinitionById: Record<string, LocalSceneDefinition> = Object.fromEntries(
  LOCAL_SCENE_DEFINITIONS.map((scene) => [scene.templateId, scene]),
)

const localDigitalHumanDisplayById: Record<string, Partial<DigitalHuman>> = Object.fromEntries(
  LOCAL_DIGITAL_HUMANS.map((human) => [human.id, human]),
)

export function getLocalScenePreviewById(): Record<string, string> {
  return { ...localTemplatePreviewById }
}

export function getLocalScenePreviewByType(): Partial<Record<VideoTemplateType, string>> {
  return {
    dealership: scene01Video,
    'single-car': scene04Video,
    'vehicle-ad': scene05Video,
  }
}
