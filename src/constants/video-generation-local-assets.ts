import messageDh01 from '@/assets/img/video-generation/message-dh-01.png'
import messageDh01Closeup from '@/assets/img/video-generation/message-dh-01-closeup.png'
import messageDh02 from '@/assets/img/video-generation/message-dh-02.jpg'
import messageDh02Closeup from '@/assets/img/video-generation/message-dh-02-closeup.png'
import messageDh03 from '@/assets/img/video-generation/message-dh-03.jpg'
import messageDh03Closeup from '@/assets/img/video-generation/message-dh-03-closeup.png'
import messageDh04 from '@/assets/img/video-generation/message-dh-04.png'
import messageDh04Closeup from '@/assets/img/video-generation/message-dh-04-closeup.png'
import messageDh05 from '@/assets/img/video-generation/message-dh-05.png'
import messageDh19 from '@/assets/img/video-generation/dh-message-19.jpg'
import messageDh18 from '@/assets/img/video-generation/dh-message-18.jpg'
import messageDh17 from '@/assets/img/video-generation/dh-message-17.jpg'
import messageDh16 from '@/assets/img/video-generation/dh-message-16.jpg'
import messageDh15 from '@/assets/img/video-generation/dh-message-15.jpg'
import messageDh14 from '@/assets/img/video-generation/dh-message-14.png'
import messageDh13 from '@/assets/img/video-generation/dh-message-13.png'
import messageDh12 from '@/assets/img/video-generation/dh-message-12.png'
import messageDh11 from '@/assets/img/video-generation/dh-message-11.png'
import messageDh10 from '@/assets/img/video-generation/dh-message-10.png'
import messageDh09 from '@/assets/img/video-generation/dh-message-09.jpg'
import messageDh08 from '@/assets/img/video-generation/dh-message-08.png'
import messageDh07 from '@/assets/img/video-generation/dh-message-07.jpg'
import messageDh06 from '@/assets/img/video-generation/dh-message-06.png'
import scene01Video from '@/assets/video/video-generation/message-scene-01-dealership.mp4'
import scene02Video from '@/assets/video/video-generation/message-scene-02-dealership.mp4'
import scene03Video from '@/assets/video/video-generation/message-scene-03-dealership.mp4'
import scene04Video from '@/assets/video/video-generation/message-scene-04-single-car.mp4'
import scene05Video from '@/assets/video/video-generation/message-scene-05-market-info.mp4'
import scene06Video from '@/assets/video/video-generation/message-scene-06-dealership-scale.mp4'
import scene20Video from '@/assets/video/video-generation/message-scene-ref-video-020-single-car.mp4'
import scene19Video from '@/assets/video/video-generation/message-scene-ref-video-019-single-car.mp4'
import scene18Video from '@/assets/video/video-generation/message-scene-ref-video-018-single-car.mp4'
import scene17Video from '@/assets/video/video-generation/message-scene-ref-video-017-single-car.mp4'
import scene16Video from '@/assets/video/video-generation/message-scene-ref-video-016-single-car.mp4'
import scene07Video from '@/assets/video/video-generation/message-scene-ref-video-007-single-car.mp4'
import scene15Video from '@/assets/video/video-generation/message-scene-ref-video-015-dealership.mp4'
import scene14Video from '@/assets/video/video-generation/message-scene-ref-video-014-dealership.mp4'
import scene13Video from '@/assets/video/video-generation/message-scene-ref-video-013-dealership.mp4'
import scene12Video from '@/assets/video/video-generation/message-scene-ref-video-012-dealership.mp4'
import scene11Video from '@/assets/video/video-generation/message-scene-ref-video-011-dealership.mp4'
import scene10Video from '@/assets/video/video-generation/message-scene-ref-video-010-dealership.mp4'
import scene09Video from '@/assets/video/video-generation/message-scene-ref-video-009-dealership.mp4'
import scene08Video from '@/assets/video/video-generation/message-scene-ref-video-008-dealership.mp4'
import { VIDEO_DURATION_SECONDS } from '@/constants/short-video'
import type { DigitalHuman, VideoTemplate, VideoTemplateType } from '@/types/video-generation'

const digitalHumanViewLabelByIndex: Record<number, string> = {
  1: '正面',
  2: '侧面',
  3: '背面',
  4: '脸部',
}

const digitalHumanImageModules = import.meta.glob('/src/assets/数字人形象/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const digitalHumanPreviewImagesById = Object.entries(digitalHumanImageModules).reduce<
  Record<string, Array<{ label: string; url: string; viewIndex: number }>>
>((result, [path, url]) => {
  const match = path.match(/数字人(\d+)\((\d)\)\.(png|jpe?g|webp)$/i)
  if (!match) return result

  const humanNumber = Number(match[1])
  const viewIndex = Number(match[2])
  if (!Number.isFinite(humanNumber) || !(viewIndex in digitalHumanViewLabelByIndex)) {
    return result
  }

  const id = `dh-message-${String(humanNumber).padStart(2, '0')}`
  result[id] ??= []
  result[id].push({
    label: digitalHumanViewLabelByIndex[viewIndex],
    url,
    viewIndex,
  })
  return result
}, {})

Object.values(digitalHumanPreviewImagesById).forEach((items) => {
  items.sort((left, right) => left.viewIndex - right.viewIndex)
})

interface LocalSceneDefinition {
  templateId: string
  title: string
  type: VideoTemplateType
  typeLabel: string
  styleLabel: string
  stylePrompt: string
  previewSubtitle?: string
  description: string
  badge: VideoTemplate['badge']
  videoUrl: string
  outputRatio: '16:9' | '9:16'
}

const LOCAL_SCENE_DEFINITIONS: LocalSceneDefinition[] = [
  {
    templateId: 'ref-video-001',
    title: '车场介绍01 / 品牌介绍',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '真实导览',
    stylePrompt: '真实二手车车场介绍风格，画面真实、口播流畅',
    previewSubtitle: '全维度介绍车场',
    description: '用于介绍门店环境、车场规模和到店看车氛围，适合作为车场介绍开场。',
    badge: 'hot',
    videoUrl: scene01Video,
    outputRatio: '16:9',
  },
  {
    templateId: 'ref-video-002',
    title: '车场介绍02 / 规模展示',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '销售导览',
    stylePrompt: '全方位介绍车场资源，传播品牌价值；从销售顾问角度介绍车场场地规模、主推品牌车辆，语调亲切、画面质感真实自然',
    previewSubtitle: '车场规模与汽车品牌',
    description: '以销售顾问口吻带看车场，突出车辆陈列、接待动线和真实服务感。',
    badge: null,
    videoUrl: scene02Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-003',
    title: '车场介绍03 / 车况展示',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '库存展示',
    stylePrompt: '从库存展示的角度，介绍车辆情况、车辆信息等，人物表情自然、口音亲切',
    previewSubtitle: '车库与车况概述',
    description: '适合展示多台车源和库存规模，再自然引出主推车型或重点车辆。',
    badge: null,
    videoUrl: scene03Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-006',
    title: '车场介绍 4｜规模现车',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '规模现车',
    stylePrompt:
      '车辆品质源头价值营销，强调车源优质、层层质检合格，强化品牌形象。',
    description:
      '车辆品质源头价值营销，强调车源优质、层层质检合格，强化品牌形象。',
    badge: 'new',
    videoUrl: scene06Video,
    outputRatio: '16:9',
  },
  // BEGIN generated material templates 2-15
  {
    templateId: 'ref-video-008',
    title: '车场介绍 5｜规模现车',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '规模现车',
    stylePrompt:
      '直观展示商家车源充足、选择丰富、更新稳定的经营实力，提升到店咨询与成交转化。',
    description:
      '直观展示商家车源充足、选择丰富、更新稳定的经营实力，提升到店咨询与成交转化。',
    badge: 'new',
    videoUrl: scene08Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-009',
    title: '车场介绍 6｜库存更新',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '库存更新',
    stylePrompt:
      '突出车场库存更新节奏稳定，每周都有新车到店，营销客户随时都有新车源可看、可选。',
    description:
      '突出车场库存更新节奏稳定，每周都有新车到店，营销客户随时都有新车源可看、可选。',
    badge: 'new',
    videoUrl: scene09Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-010',
    title: '车场介绍 7｜规模现车',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '规模现车',
    stylePrompt:
      '帮助商家通过真实车况展示与诚信经营表达，建立客户信任，减少看车顾虑。',
    description:
      '帮助商家通过真实车况展示与诚信经营表达，建立客户信任，减少看车顾虑。',
    badge: 'new',
    videoUrl: scene10Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-011',
    title: '车场介绍 8｜精品车源',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '精品车源',
    stylePrompt:
      '突出“严选精品车，拒收泡水车、重大事故车”，展现车源优质、车况透明、买车更放心。',
    description:
      '突出“严选精品车，拒收泡水车、重大事故车”，展现车源优质、车况透明、买车更放心。',
    badge: 'new',
    videoUrl: scene11Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-012',
    title: '车场介绍 9｜售后保障',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '售后保障',
    stylePrompt:
      '突出买车后有问题能联系、能沟通、有人对接，让本地及海外客户都更安心。',
    description:
      '突出买车后有问题能联系、能沟通、有人对接，让本地及海外客户都更安心。',
    badge: 'new',
    videoUrl: scene12Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-013',
    title: '车场介绍 10｜海外售后',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '海外售后',
    stylePrompt:
      '帮助商家通过真实车况呈现与合理价格说明，降低远程看车顾虑，让客户都能更安心咨询。',
    description:
      '帮助商家通过真实车况呈现与合理价格说明，降低远程看车顾虑，让客户都能更安心咨询。',
    badge: 'new',
    videoUrl: scene13Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-014',
    title: '车场介绍 11｜服务保障',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '服务保障',
    stylePrompt:
      '展示全天候运营与及时沟通能力，提升客户信任度，营造品牌可靠的口碑形象。',
    description:
      '展示全天候运营与及时沟通能力，提升客户信任度，营造品牌可靠的口碑形象。',
    badge: 'new',
    videoUrl: scene14Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-015',
    title: '车场介绍 12｜全天沟通',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '全天沟通',
    stylePrompt:
      '展示全天候运营与及时沟通能力，提升客户信任度，营造品牌可靠的口碑形象。',
    description:
      '展示全天候运营与及时沟通能力，提升客户信任度，营造品牌可靠的口碑形象。',
    badge: 'new',
    videoUrl: scene15Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-007',
    title: '单车介绍 2｜出口海外',
    type: 'single-car',
    typeLabel: '单车介绍',
    styleLabel: '出口海外',
    stylePrompt:
      '适配海外市场需求、手续资料相对齐全等优势，提升客户远程咨询与采购信心。',
    description:
      '适配海外市场需求、手续资料相对齐全等优势，提升客户远程咨询与采购信心。',
    badge: 'new',
    videoUrl: scene07Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-016',
    title: '单车介绍 3｜外观成色',
    type: 'single-car',
    typeLabel: '单车介绍',
    styleLabel: '外观成色',
    stylePrompt:
      '展示车辆外观成色、漆面光泽与整体质感，提升客户看车兴趣与咨询意愿。',
    description:
      '展示车辆外观成色、漆面光泽与整体质感，提升客户看车兴趣与咨询意愿。',
    badge: 'new',
    videoUrl: scene16Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-017',
    title: '单车介绍 4｜动力工况',
    type: 'single-car',
    typeLabel: '单车介绍',
    styleLabel: '动力工况',
    stylePrompt:
      '呈现车辆加速响应、行驶质感与核心工况，让客户更直观判断车辆状态，提升品牌形象。',
    description:
      '呈现车辆加速响应、行驶质感与核心工况，让客户更直观判断车辆状态，提升品牌形象。',
    badge: 'new',
    videoUrl: scene17Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-018',
    title: '单车介绍 5｜内饰配置',
    type: 'single-car',
    typeLabel: '单车介绍',
    styleLabel: '内饰配置',
    stylePrompt: '内饰保养新、座椅磨损低、配置丰富实用，使用“几乎”等模糊副词，不绝对化',
    description: '内饰保养新、座椅磨损低、配置丰富实用，使用“几乎”等模糊副词，不绝对化',
    badge: 'new',
    videoUrl: scene18Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-019',
    title: '单车介绍 6｜检测透明',
    type: 'single-car',
    typeLabel: '单车介绍',
    styleLabel: '检测透明',
    stylePrompt: '已通过专业检测、报告可查、车况透明',
    description: '已通过专业检测、报告可查、车况透明',
    badge: 'new',
    videoUrl: scene19Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-020',
    title: '单车介绍 7｜来源透明',
    type: 'single-car',
    typeLabel: '单车介绍',
    styleLabel: '来源透明',
    stylePrompt: '车主卖车原因真实、车况来源透明，不出现具体里程和未经确认的具体车辆数据',
    description: '车主卖车原因真实、车况来源透明，不出现具体里程和未经确认的具体车辆数据',
    badge: 'new',
    videoUrl: scene20Video,
    outputRatio: '9:16',
  },
  // END generated material templates 2-15
  {
    templateId: 'ref-video-004',
    title: '单车品介绍 / 展厅实车讲解',
    type: 'single-car',
    typeLabel: '单车品介绍',
    styleLabel: '实车讲解',
    stylePrompt: '根据车辆五维信息，自动获取车辆卖点，全车概况详细解释',
    previewSubtitle: '全车概况讲解',
    description: '聚焦单台车辆，按外观、内饰、空间和使用场景完成短节奏讲解。',
    badge: 'hot',
    videoUrl: scene04Video,
    outputRatio: '9:16',
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
    outputRatio: '9:16',
  },
]

const LOCAL_DIGITAL_HUMANS: DigitalHuman[] = [
  {
    id: 'dh-message-01',
    name: '数字人 1｜亲和女声',
    gender: 'female',
    ageStyle: '年轻女性 · 预设音色 Friendly Paige',
    previewUrl: messageDh01Closeup,
    imageUrl: messageDh01,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-02',
    name: '数字人 2｜专业男声',
    gender: 'male',
    ageStyle: '年轻男性 · 预设音色 博学讲师',
    previewUrl: messageDh02Closeup,
    imageUrl: messageDh02,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-03',
    name: '数字人 3｜明亮女声',
    gender: 'female',
    ageStyle: '年轻女性 · 预设音色 Bright Queen',
    previewUrl: messageDh03Closeup,
    imageUrl: messageDh03,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-04',
    name: '数字人 4｜活力女声',
    gender: 'female',
    ageStyle: '年轻女性 · 预设音色 EngagingGirl',
    previewUrl: messageDh04Closeup,
    imageUrl: messageDh04,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-05',
    name: '数字人 5｜车场介绍',
    gender: 'female',
    ageStyle: '车场销售形象 · 预设音色 Grounded Grace - 清亮女声',
    previewUrl: messageDh05,
    imageUrl: messageDh05,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  // BEGIN generated digital humans 6-19
  {
    id: 'dh-message-06',
    name: '数字人 6｜规模现车',
    gender: 'female',
    ageStyle: '车场销售形象 · 预设音色 阿历姐姐 - 温润厚实女声',
    previewUrl: messageDh06,
    imageUrl: messageDh06,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-07',
    name: '数字人 7｜库存更新',
    gender: 'female',
    ageStyle: '车场销售形象 · 预设音色 灵动女声 - 清脆萌感女声',
    previewUrl: messageDh07,
    imageUrl: messageDh07,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-08',
    name: '数字人 8｜规模现车',
    gender: 'female',
    ageStyle: '车场销售形象 · 预设音色 Friendly Paige - 清亮轻快女声',
    previewUrl: messageDh08,
    imageUrl: messageDh08,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-09',
    name: '数字人 9｜精品车源',
    gender: 'female',
    ageStyle: '车场销售形象 · 预设音色 EngagingGirl - 清亮有活力女声',
    previewUrl: messageDh09,
    imageUrl: messageDh09,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-10',
    name: '数字人 10｜售后保障',
    gender: 'female',
    ageStyle: '车场销售形象 · 预设音色 甜美女声 - 清朗甜美女声',
    previewUrl: messageDh10,
    imageUrl: messageDh10,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-11',
    name: '数字人 11｜海外售后',
    gender: 'female',
    ageStyle: '车场销售形象 · 预设音色 甜美女声 - 清脆青春女声',
    previewUrl: messageDh11,
    imageUrl: messageDh11,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-12',
    name: '数字人 12｜服务保障',
    gender: 'female',
    ageStyle: '车场销售形象 · 预设音色 Grounded Grace - 清亮女声',
    previewUrl: messageDh12,
    imageUrl: messageDh12,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-13',
    name: '数字人 13｜全天沟通',
    gender: 'female',
    ageStyle: '车场销售形象 · 预设音色 Energetic Marketer - 清亮营销女声',
    previewUrl: messageDh13,
    imageUrl: messageDh13,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-14',
    name: '数字人 14｜出口海外',
    gender: 'female',
    ageStyle: '单车讲解形象 · 预设音色 Energetic Marketer - 清亮营销女声',
    previewUrl: messageDh14,
    imageUrl: messageDh14,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-15',
    name: '数字人 15｜外观成色',
    gender: 'female',
    ageStyle: '单车讲解形象 · 预设音色 Energetic Marketer - 清亮营销女声',
    previewUrl: messageDh15,
    imageUrl: messageDh15,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-16',
    name: '数字人 16｜动力工况',
    gender: 'female',
    ageStyle: '单车讲解形象 · 预设音色 Energetic Marketer - 清亮营销女声',
    previewUrl: messageDh16,
    imageUrl: messageDh16,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-17',
    name: '数字人 17｜内饰配置',
    gender: 'female',
    ageStyle: '单车讲解形象 · 预设音色 Grounded Grace - 清亮女声',
    previewUrl: messageDh17,
    imageUrl: messageDh17,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-18',
    name: '数字人 18｜检测透明',
    gender: 'female',
    ageStyle: '单车讲解形象 · 预设音色 清爽女声 - 清晰对话感女声',
    previewUrl: messageDh18,
    imageUrl: messageDh18,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-19',
    name: '数字人 19｜来源透明',
    gender: 'female',
    ageStyle: '单车讲解形象 · 预设音色 Grounded Grace - 清亮女声',
    previewUrl: messageDh19,
    imageUrl: messageDh19,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  // END generated digital humans 6-19
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
    previewSubtitle: scene.previewSubtitle,
    durationSeconds: VIDEO_DURATION_SECONDS,
    durationLabel: '≤00:15',
    outputRatio: scene.outputRatio,
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
  return apiTemplates.length
    ? apiTemplates.map((template) => {
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
        previewSubtitle: local.previewSubtitle,
        scenePrompt: template.scenePrompt ?? local.stylePrompt,
        thumbnailUrl: local.videoUrl,
        previewUrl: local.videoUrl,
        outputRatio: local.outputRatio,
        status: local.type === 'vehicle-ad' ? 'coming_soon' : template.status,
        generationReadiness:
          local.type === 'vehicle-ad' ? 'unavailable' : template.generationReadiness,
        reason: local.type === 'vehicle-ad' ? '该模板暂未开放，敬请期待！' : template.reason,
      }
    })
    : LOCAL_SCENE_DEFINITIONS.map(buildFallbackSceneTemplate)
}

export function getLocalDigitalHumans(apiHumans: DigitalHuman[] = []): DigitalHuman[] {
  if (apiHumans.length) {
    return apiHumans.map((human) => ({
      ...human,
      ...localDigitalHumanDisplayById[human.id],
      previewUrl: localDigitalHumanDisplayById[human.id]?.previewUrl ?? human.previewUrl,
      imageUrl: localDigitalHumanDisplayById[human.id]?.imageUrl ?? human.imageUrl,
      previewImages:
        localDigitalHumanDisplayById[human.id]?.previewImages ?? human.previewImages,
    }))
  }
  return LOCAL_DIGITAL_HUMANS.map((human) => ({
    ...human,
    previewImages: digitalHumanPreviewImagesById[human.id]?.map(({ label, url }) => ({
      label,
      url,
    })),
  }))
}

export function isLocalOnlyDigitalHumanId(digitalHumanId: string) {
  return digitalHumanId.startsWith('local-dh-')
}

export const localTemplatePreviewById: Record<string, string> = Object.fromEntries(
  LOCAL_SCENE_DEFINITIONS.map((scene) => [scene.templateId, scene.videoUrl]),
)

export const localTemplateTitleById: Record<string, string> = Object.fromEntries(
  LOCAL_SCENE_DEFINITIONS.map((scene) => [scene.templateId, scene.title]),
)

const localSceneDefinitionById: Record<string, LocalSceneDefinition> = Object.fromEntries(
  LOCAL_SCENE_DEFINITIONS.map((scene) => [scene.templateId, scene]),
)

const localDigitalHumanDisplayById: Record<string, Partial<DigitalHuman>> = Object.fromEntries(
  LOCAL_DIGITAL_HUMANS.map((human) => [
    human.id,
    {
      ...human,
      previewImages: digitalHumanPreviewImagesById[human.id]?.map(({ label, url }) => ({
        label,
        url,
      })),
    },
  ]),
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
