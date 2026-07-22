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
import messageDh21 from '@/assets/img/video-generation/dh-message-21.png'
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
import scene21Video from '@/assets/video/video-generation/message-scene-ref-video-021-single-car-landscape-v2.mp4'
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
  1: '正视图',
  2: '侧视图',
  3: '背视图',
  4: '面部图',
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

function resolveDigitalHumanFaceUrl(digitalHumanId: string) {
  return digitalHumanPreviewImagesById[digitalHumanId]?.find((item) => item.viewIndex === 4)?.url
}

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
    title: '全方位车场营销',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '品牌营销',
    stylePrompt:
      '真实二手车车场介绍风格，全方位介绍车场资源，传播品牌价值，提高品牌知名度。',
    previewSubtitle: '车场介绍01 · 15S · 品牌营销',
    description:
      '真实二手车车场介绍风格，全方位介绍车场资源，传播品牌价值，提高品牌知名度。',
    badge: 'hot',
    videoUrl: scene01Video,
    outputRatio: '16:9',
  },
  {
    templateId: 'ref-video-002',
    title: '实力与资源宣传',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '实力背书',
    stylePrompt:
      '展示车商的车场规模、主推品牌车辆等，为车商的实力与资源背书，增强客户信任感。',
    previewSubtitle: '车场介绍02 · 15S · 实力背书',
    description:
      '展示车商的车场规模、主推品牌车辆等，为车商的实力与资源背书，增强客户信任感。',
    badge: null,
    videoUrl: scene02Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-003',
    title: '无套路车况口播',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '诚信营销',
    stylePrompt:
      '老朋友聊天式介绍车商的车辆情况、价格情况，直击买车用车痛点，降低用户买车顾虑。',
    previewSubtitle: '车场介绍03 · 15S · 诚信营销',
    description:
      '老朋友聊天式介绍车商的车辆情况、价格情况，直击买车用车痛点，降低用户买车顾虑。',
    badge: null,
    videoUrl: scene03Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-006',
    title: '车辆品质承诺',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '品质营销',
    stylePrompt:
      '强调车源优质、层层质检合格，突出车商对车辆品质的重视，让用户直观感受车商的靠谱。',
    previewSubtitle: '车场介绍04 · 15S · 品质营销',
    description:
      '强调车源优质、层层质检合格，突出车商对车辆品质的重视，让用户直观感受车商的靠谱。',
    badge: 'new',
    videoUrl: scene06Video,
    outputRatio: '16:9',
  },
  // BEGIN generated material templates 2-15
  {
    templateId: 'ref-video-008',
    title: '现车资源展示',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '车源营销',
    stylePrompt:
      '直观展示商家车源充足、选择丰富、更新稳定的经营实力，提升用户咨询与成交转化率。',
    previewSubtitle: '车场介绍05 · 15S · 车源营销',
    description:
      '直观展示商家车源充足、选择丰富、更新稳定的经营实力，提升用户咨询与成交转化率。',
    badge: 'new',
    videoUrl: scene08Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-009',
    title: '车辆上新快口播',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '上新率营销',
    stylePrompt:
      '突出车商库存更新节奏稳定，每周都有新车到店，提醒客户随时都有新车源可看、可选。',
    previewSubtitle: '车场介绍06 · 15S · 上新率营销',
    description:
      '突出车商库存更新节奏稳定，每周都有新车到店，提醒客户随时都有新车源可看、可选。',
    badge: 'new',
    videoUrl: scene09Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-010',
    title: '诚信经营营销',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '诚信营销',
    stylePrompt:
      '自然口播风，以画面的真实车场验证商家台词“所见即所得”，帮助商家建立客户信任。',
    previewSubtitle: '车场介绍07 · 15S · 诚信营销',
    description:
      '自然口播风，以画面的真实车场验证商家台词“所见即所得”，帮助商家建立客户信任。',
    badge: 'new',
    videoUrl: scene10Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-011',
    title: '车况品质承诺',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '车况营销',
    stylePrompt:
      '以“严选精品车，拒收泡水车、重大事故车”为标准，展现商家车源优质、车况透明等优势。',
    previewSubtitle: '车场介绍08 · 15S · 车况营销',
    description:
      '以“严选精品车，拒收泡水车、重大事故车”为标准，展现商家车源优质、车况透明等优势。',
    badge: 'new',
    videoUrl: scene11Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-012',
    title: '售后服务有保障',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '售后营销',
    stylePrompt:
      '突出车商售后实力，买车后有问题能联系、能沟通、有人对接，让本地及海外客户都更安心。',
    previewSubtitle: '车场介绍09 · 15S · 售后营销',
    description:
      '突出车商售后实力，买车后有问题能联系、能沟通、有人对接，让本地及海外客户都更安心。',
    badge: 'new',
    videoUrl: scene12Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-013',
    title: '诚信经营承诺',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '诚信营销',
    stylePrompt:
      '帮助商家传递“一车一况一价”的诚信经营理念，让本地及海外客户远程看车也更放心。',
    previewSubtitle: '车场介绍10 · 15S · 诚信营销',
    description:
      '帮助商家传递“一车一况一价”的诚信经营理念，让本地及海外客户远程看车也更放心。',
    badge: 'new',
    videoUrl: scene13Video,
    outputRatio: '16:9',
  },
  {
    templateId: 'ref-video-014',
    title: '渠道资源展示',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '渠道营销',
    stylePrompt:
      '展示商家在车辆品牌与渠道资源优势，从而提升客户的咨询兴趣与到店意愿。',
    previewSubtitle: '车场介绍11 · 15S · 渠道营销',
    description:
      '展示商家在车辆品牌与渠道资源优势，从而提升客户的咨询兴趣与到店意愿。',
    badge: 'new',
    videoUrl: scene14Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-015',
    title: '全天候运营打造',
    type: 'dealership',
    typeLabel: '车场介绍',
    styleLabel: '服务营销',
    stylePrompt:
      '展示全天候运营与及时沟通能力，提升客户信任度，打造车商服务贴心、周到的形象。',
    previewSubtitle: '车场介绍12 · 15S · 服务营销',
    description:
      '展示全天候运营与及时沟通能力，提升客户信任度，打造车商服务贴心、周到的形象。',
    badge: 'new',
    videoUrl: scene15Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-007',
    title: '车辆配置当地适配',
    type: 'single-car',
    typeLabel: '单车品介绍',
    styleLabel: '出口适配营销',
    stylePrompt:
      '强调车商产品适配海外市场需求、手续资料相对齐全等优势，提升客户远程咨询与采购信心。',
    previewSubtitle: '单车品介绍02 · 15S · 出口适配营销',
    description:
      '强调车商产品适配海外市场需求、手续资料相对齐全等优势，提升客户远程咨询与采购信心。',
    badge: 'new',
    videoUrl: scene07Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-016',
    title: '全车外观成色展示',
    type: 'single-car',
    typeLabel: '单车品介绍',
    styleLabel: '外观成色营销',
    stylePrompt:
      '全方位展示车辆外观成色、漆面光泽与整体质感，助力车商提升客户看车兴趣与咨询意愿。',
    previewSubtitle: '单车品介绍03 · 15S · 外观成色营销',
    description:
      '全方位展示车辆外观成色、漆面光泽与整体质感，助力车商提升客户看车兴趣与咨询意愿。',
    badge: 'new',
    videoUrl: scene16Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-017',
    title: '车辆动力情况详解',
    type: 'single-car',
    typeLabel: '单车品介绍',
    styleLabel: '车况动力营销',
    stylePrompt:
      '展示车辆加速响应、行驶质感与动力情况，让客户更直观判断车辆状态，提升品牌形象。',
    previewSubtitle: '单车品介绍04 · 15S · 车况动力营销',
    description:
      '展示车辆加速响应、行驶质感与动力情况，让客户更直观判断车辆状态，提升品牌形象。',
    badge: 'new',
    videoUrl: scene17Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-018',
    title: '车辆内饰配置介绍',
    type: 'single-car',
    typeLabel: '单车品介绍',
    styleLabel: '内饰配置营销',
    stylePrompt:
      '展示车辆内饰成色、座椅磨损与实用配置，让客户直观看到车内状态和用车体验。',
    previewSubtitle: '单车品介绍05 · 15S · 内饰配置营销',
    description:
      '展示车辆内饰成色、座椅磨损与实用配置，让客户直观看到车内状态和用车体验。',
    badge: 'new',
    videoUrl: scene18Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-019',
    title: '车辆检测透明营销',
    type: 'single-car',
    typeLabel: '单车品介绍',
    styleLabel: '检测透明营销',
    stylePrompt:
      '通过专业检测与可查报告呈现车辆真实情况，提升车商形象及客户咨询与成交度。',
    previewSubtitle: '单车品介绍06 · 15S · 检测透明营销',
    description:
      '通过专业检测与可查报告呈现车辆真实情况，提升车商形象及客户咨询与成交度。',
    badge: 'new',
    videoUrl: scene19Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-020',
    title: '车辆来源与背景介绍',
    type: 'single-car',
    typeLabel: '单车品介绍',
    styleLabel: '车源信息营销',
    stylePrompt:
      '介绍车辆出售原因及车源背景，帮助客户更了解车辆来路，助力商家塑造诚信经营的形象。',
    previewSubtitle: '单车品介绍07 · 15S · 车源信息营销',
    description:
      '介绍车辆出售原因及车源背景，帮助客户更了解车辆来路，助力商家塑造诚信经营的形象。',
    badge: 'new',
    videoUrl: scene20Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-021',
    title: '户外实车全景介绍',
    type: 'single-car',
    typeLabel: '单车品介绍',
    styleLabel: '户外专业讲解',
    stylePrompt:
      '白天户外实车导览，女性汽车销售顾问与车辆自然同框，围绕车辆外观和图片能够确认的特点进行专业、亲和的讲解。',
    previewSubtitle: '单车品介绍08 · 15S · 户外专业讲解',
    description:
      '在明亮户外环境展示车辆整体外观和车身姿态，通过自然口播引导用户进一步了解实车。',
    badge: 'new',
    videoUrl: scene21Video,
    outputRatio: '16:9',
  },
  // END generated material templates 2-15
  {
    templateId: 'ref-video-004',
    title: '全方位实车讲解',
    type: 'single-car',
    typeLabel: '单车品介绍',
    styleLabel: '产品概况营销',
    stylePrompt:
      '根据车辆五维信息，自动获取车辆卖点，详细讲解全车概况，降低车商营销成本。',
    previewSubtitle: '单车品介绍01 · 15S · 产品概况营销',
    description:
      '根据车辆五维信息，自动获取车辆卖点，详细讲解全车概况，降低车商营销成本。',
    badge: 'hot',
    videoUrl: scene04Video,
    outputRatio: '9:16',
  },
  {
    templateId: 'ref-video-005',
    title: '车辆广告｜动态展示',
    type: 'vehicle-ad',
    typeLabel: '车辆广告',
    styleLabel: '特效广告',
    stylePrompt: '基于车辆外观与内饰图片生成 15 秒纯车辆动态广告，无数字人、无口播。',
    description: '选择广告效果后生成车辆动态展示视频，适合投放短视频平台和车源广告。',
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
    ageStyle: '年轻男性 · 预设音色 舒朗男声',
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
    ageStyle: '车场销售形象 · 预设音色 阅历姐姐 - 温润厚实女声',
    previewUrl: messageDh06,
    imageUrl: messageDh06,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-07',
    name: '数字人 7｜库存更新',
    gender: 'female',
    ageStyle: '车场销售形象 · 预设音色 灵动女声 - 清脆明亮女声',
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
    ageStyle: '车场销售形象 · 预设音色 甜美女声 - 清脆甜美女声',
    previewUrl: messageDh10,
    imageUrl: messageDh10,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
  {
    id: 'dh-message-11',
    name: '数字人 11｜海外售后',
    gender: 'female',
    ageStyle: '车场销售形象 · 预设音色 甜美少女 - 清脆表现力女声',
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
  {
    id: 'dh-message-21',
    name: '数字人 21｜户外实车女顾问',
    gender: 'female',
    ageStyle: '专业亲和汽车销售顾问 · 预设音色 亲和女声 - 温和讲解',
    previewUrl: messageDh21,
    imageUrl: messageDh21,
    voiceStatus: 'ready',
    voiceModel: 'speech-2.8-hd',
  },
]

/** 模板预览出镜数字人 → 左侧默认选中的数字人（非强绑定，用户可手动更换） */
export const templateDefaultDigitalHumanById: Record<string, string> = {
  'ref-video-001': 'dh-message-04',
  'ref-video-002': 'dh-message-01',
  'ref-video-003': 'dh-message-02',
  'ref-video-006': 'dh-message-05',
  'ref-video-008': 'dh-message-06',
  'ref-video-009': 'dh-message-07',
  'ref-video-010': 'dh-message-08',
  'ref-video-011': 'dh-message-09',
  'ref-video-012': 'dh-message-10',
  'ref-video-013': 'dh-message-11',
  'ref-video-014': 'dh-message-12',
  'ref-video-015': 'dh-message-13',
  'ref-video-004': 'dh-message-13',
  'ref-video-007': 'dh-message-14',
  'ref-video-016': 'dh-message-15',
  'ref-video-017': 'dh-message-16',
  'ref-video-018': 'dh-message-17',
  'ref-video-019': 'dh-message-18',
  'ref-video-020': 'dh-message-19',
  'ref-video-021': 'dh-message-21',
}

export function resolveTemplateDefaultDigitalHumanId(templateId: string) {
  return templateDefaultDigitalHumanById[templateId]
}

/** 生成质量优先展示的模板，按运营指定顺序排列 */
export const featuredTemplateOrder: string[] = [
  'ref-video-021',
  'ref-video-017',
  'ref-video-018',
  'ref-video-016',
  'ref-video-004',
  'ref-video-006',
  'ref-video-003',
  'ref-video-001',
]

function sortTemplatesByFeaturedOrder(templates: VideoTemplate[]): VideoTemplate[] {
  const featuredIndex = new Map(
    featuredTemplateOrder.map((templateId, index) => [templateId, index]),
  )

  return templates
    .map((template, originalIndex) => ({ template, originalIndex }))
    .sort((left, right) => {
      const leftFeatured = featuredIndex.get(left.template.templateId)
      const rightFeatured = featuredIndex.get(right.template.templateId)
      if (leftFeatured !== undefined && rightFeatured !== undefined) {
        return leftFeatured - rightFeatured
      }
      if (leftFeatured !== undefined) return -1
      if (rightFeatured !== undefined) return 1
      return left.originalIndex - right.originalIndex
    })
    .map(({ template }) => template)
}

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
    status: 'available',
    generationReadiness: 'ready',
    reason: undefined,
    defaultDigitalHumanId: resolveTemplateDefaultDigitalHumanId(scene.templateId),
  }
}

export function getLocalVideoSceneTemplates(apiTemplates: VideoTemplate[] = []): VideoTemplate[] {
  const templates = apiTemplates.length
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
        status: template.status,
        generationReadiness: template.generationReadiness,
        reason: template.reason,
        defaultDigitalHumanId:
          resolveTemplateDefaultDigitalHumanId(template.templateId) ??
          template.defaultDigitalHumanId,
      }
    })
    : LOCAL_SCENE_DEFINITIONS.map(buildFallbackSceneTemplate)

  return sortTemplatesByFeaturedOrder(templates)
}

export function getLocalDigitalHumans(apiHumans: DigitalHuman[] = []): DigitalHuman[] {
  if (apiHumans.length) {
    return apiHumans.map((human) => ({
      ...human,
      ...localDigitalHumanDisplayById[human.id],
      previewUrl:
        resolveDigitalHumanFaceUrl(human.id) ??
        localDigitalHumanDisplayById[human.id]?.previewUrl ??
        human.previewUrl,
      imageUrl: localDigitalHumanDisplayById[human.id]?.imageUrl ?? human.imageUrl,
      previewImages:
        localDigitalHumanDisplayById[human.id]?.previewImages ?? human.previewImages,
    }))
  }
  return LOCAL_DIGITAL_HUMANS.map((human) => ({
    ...human,
    previewUrl: resolveDigitalHumanFaceUrl(human.id) ?? human.previewUrl,
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
      previewUrl: resolveDigitalHumanFaceUrl(human.id) ?? human.previewUrl,
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
