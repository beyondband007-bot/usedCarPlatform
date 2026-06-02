import type {
  WorkspaceCapability,
  WorkspaceCapabilityBlock,
  WorkspaceMenuGroup,
  WorkspaceMenuItem,
  WorkspaceOption,
  WorkspaceTemplateRecommendation,
} from '@/types/workspace'

import roadSceneBusinessPark from '@/assets/img/道路动态/场景选择/商务园区.png'
import roadSceneCityDay from '@/assets/img/道路动态/场景选择/城市主干道.png'
import roadSceneCoastal from '@/assets/img/道路动态/场景选择/海岸公路.png'
import roadSceneForest from '@/assets/img/道路动态/场景选择/林荫大道.png'
import roadSceneHighwaySunset from '@/assets/img/道路动态/场景选择/夕阳高速.png'
import roadSceneMountainCurve from '@/assets/img/道路动态/场景选择/山路弯道.png'
import roadSceneOverpassDusk from '@/assets/img/道路动态/场景选择/傍晚高架.png'
import roadSceneRainyNight from '@/assets/img/道路动态/场景选择/雨夜城市.png'
import roadSceneSnow from '@/assets/img/道路动态/场景选择/雪后公路.png'
import roadSceneTunnelExit from '@/assets/img/道路动态/场景选择/隧道出口.png'
import roadTutorialBusinessPark from '@/assets/img/道路动态/教程背景图/商务园区.png'
import roadTutorialCityDay from '@/assets/img/道路动态/教程背景图/城市主干道.png'
import roadTutorialHighwaySunset from '@/assets/img/道路动态/教程背景图/夕阳高速.png'
import roadTutorialOverpassDusk from '@/assets/img/道路动态/教程背景图/傍晚高架.png'
import showroomTutorialClassicWhite from '@/assets/img/展厅灯光/教程图片/经典白棚.png'
import showroomTutorialGlass from '@/assets/img/展厅灯光/教程图片/玻璃展厅.png'
import showroomTutorialLuxuryDark from '@/assets/img/展厅灯光/教程图片/暗调豪华.png'
import showroomTutorialSoftTop from '@/assets/img/展厅灯光/教程图片/柔光灯顶.png'
import outdoorTutorialTreePark from '@/assets/img/户外场景/教程/林荫公园.png'
import outdoorTutorialMountainLake from '@/assets/img/户外场景/教程/山野湖畔.png'
import outdoorTutorialCityBlock from '@/assets/img/户外场景/教程/城市街区.png'
import outdoorTutorialCoastDaylight from '@/assets/img/户外场景/教程/海滨城市.png'
import skyTutorialMirrorField from '@/assets/img/天空影棚/天空影棚教程/天空镜场.png'
import skyTutorialSunsetDrive from '@/assets/img/天空影棚/天空影棚教程/夕阳车镜.png'
import skyTutorialCloudSeaStage from '@/assets/img/天空影棚/天空影棚教程/云海展台.png'
import skyTutorialCloudParking from '@/assets/img/天空影棚/天空影棚教程/云镜车场.png'
const sceneImageUrls = {
  outdoorTreePark:
    'https://vip.123pan.cn/1849524247/yk6baz03t0n000ddyboalfimigpnuca1DIYxBIJvAdixAvxzBIUzAIr=.png',
  outdoorHarborCity:
    'https://vip.123pan.cn/1849524247/ymjew503t0m000ddy7xb5scpo6k88m3eDIYxBIJvAdixAvxzBIUzAIr=.png',
  outdoorMountainLake:
    'https://vip.123pan.cn/1849524247/yk6baz03t0m000ddyboa0qamynpnt1z8DIYxBIJvAdixAvxzBIUzAIr=.png',
  outdoorCityBlock:
    'https://vip.123pan.cn/1849524247/yk6baz03t0l000ddybo4mc19qipnsx41DIYxBIJvAdixAvxzBIUzAIr=.png',
  skyCloudParking:
    'https://vip.123pan.cn/1849524247/yk6baz03t0n000ddybnoit1y2xpnlni5DIYxBIJvAdixAvxzBIUzAIr=.png',
  skyCloudSeaStage:
    'https://vip.123pan.cn/1849524247/yk6baz03t0m000ddybnnhxeyk0pnkuvcDIYxBIJvAdixAvxzBIUzAIr=.png',
  skySunsetDrive:
    'https://vip.123pan.cn/1849524247/ymjew503t0m000ddy7wwfo8bmfk7z8blDIYxBIJvAdixAvxzBIUzAIr=.png',
  skyMirrorField:
    'https://vip.123pan.cn/1849524247/ymjew503t0l000ddy7wt7tz9adk7y9bsDIYxBIJvAdixAvxzBIUzAIr=.png',
  showroomSoftTop:
    'https://vip.123pan.cn/1849524247/ymjew503t0n000ddy7w8j8l064k7o12vDIYxBIJvAdixAvxzBIUzAIr=.png',
  showroomClassicWhite:
    'https://vip.123pan.cn/1849524247/yk6baz03t0m000ddybmzldg3i4pn8kbxDIYxBIJvAdixAvxzBIUzAIr=.png',
  showroomMinimal:
    'https://vip.123pan.cn/1849524247/yk6baz03t0l000ddybmybi6j7tpn7u6lDIYxBIJvAdixAvxzBIUzAIr=.png',
  showroomWideAngle:
    'https://vip.123pan.cn/1849524247/ymjew503t0m000ddy7w3h8c200k7nsa3DIYxBIJvAdixAvxzBIUzAIr=.png',
  showroomGlass:
    'https://vip.123pan.cn/1849524247/ymjew503t0l000ddy7w2k4md85k7mx2kDIYxBIJvAdixAvxzBIUzAIr=.png',
  showroomLuxuryDark:
    'https://vip.123pan.cn/1849524247/yk6baz03t0m000ddybmt5my1lmpn5lygDIYxBIJvAdixAvxzBIUzAIr=.png',
}

const tutorial = [
  {
    title: '上传车图',
    image:
      'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=360&q=80',
  },
  {
    title: '选择模板',
    image:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=360&q=80',
  },
  { title: '选择 Logo', text: '宇晟名车' },
  {
    title: '生成效果',
    image:
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=360&q=80',
  },
] satisfies WorkspaceCapability['tutorial']

const commonRequirements = ['车辆完整入镜', '画面清晰无遮挡', '光线均匀少反光']

const createOptions = (items: Array<[string, string, string]>): WorkspaceOption[] =>
  items.map(([id, title, image]) => ({ id, title, image }))

const showroomOptions = createOptions([
  ['white-studio', '经典白棚', sceneImageUrls.showroomClassicWhite],
  ['glass-hall', '玻璃展厅', sceneImageUrls.showroomGlass],
  ['luxury-dark', '暗调奢华', sceneImageUrls.showroomLuxuryDark],
  ['soft-top-light', '柔光灯顶', sceneImageUrls.showroomSoftTop],
  ['minimal-space', '极简留白', sceneImageUrls.showroomMinimal],
  ['wide-angle', '广角空间', sceneImageUrls.showroomWideAngle],
])

const outdoorOptions = createOptions([
  ['tree-park', '林荫公园', sceneImageUrls.outdoorTreePark],
  ['mountain-lake', '山野湖畔', sceneImageUrls.outdoorMountainLake],
  ['city-block', '城市街区', sceneImageUrls.outdoorCityBlock],
  ['coast-daylight', '海滨城市', sceneImageUrls.outdoorHarborCity],
])

const roadOptions = createOptions([
  ['city_day_road', '城市主干道', roadSceneCityDay],
  ['highway_sunset', '夕阳高速', roadSceneHighwaySunset],
  ['overpass_dusk', '傍晚高架', roadSceneOverpassDusk],
  ['business_park', '商务园区', roadSceneBusinessPark],
  ['rainy_night_city', '雨夜城市', roadSceneRainyNight],
  ['mountain_curve', '山路弯道', roadSceneMountainCurve],
  ['coastal_road', '海岸公路', roadSceneCoastal],
  ['forest_avenue', '林荫大道', roadSceneForest],
  ['snow_road', '雪后公路', roadSceneSnow],
  ['tunnel_exit', '隧道出口', roadSceneTunnelExit],
])

const skyOptions = createOptions([
  ['sky-mirror-field', '天空镜场', sceneImageUrls.skyMirrorField],
  ['sunset-drive', '夕阳车镜', sceneImageUrls.skySunsetDrive],
  ['cloud-sea-stage', '云海展台', sceneImageUrls.skyCloudSeaStage],
  ['cloud-parking', '云镜车场', sceneImageUrls.skyCloudParking],
])

export interface BatchSceneItem {
  title: string
  optionId: string
  image: string
}

export interface BatchSceneCategory {
  category: string
  apiCode: string
  scenes: BatchSceneItem[]
}

const mapWorkspaceOptions = (options: WorkspaceOption[]): BatchSceneItem[] =>
  options.map((item) => ({
    title: item.title,
    optionId: item.id,
    image: item.image,
  }))

export const batchSceneCatalog: BatchSceneCategory[] = [
  {
    category: '展厅灯光',
    apiCode: 'scene_showroom_light',
    scenes: mapWorkspaceOptions(showroomOptions),
  },
  {
    category: '户外场景',
    apiCode: 'scene_outdoor',
    scenes: mapWorkspaceOptions(outdoorOptions),
  },
  {
    category: '道路动态',
    apiCode: 'scene_road_motion',
    scenes: mapWorkspaceOptions(roadOptions),
  },
  {
    category: '天空影棚',
    apiCode: 'scene_sky_studio',
    scenes: mapWorkspaceOptions(skyOptions),
  },
]

export const batchSceneCategoryOptions = batchSceneCatalog.map((item) => ({
  label: item.category,
  value: item.category,
}))

export function getBatchScenesByCategory(category: string): BatchSceneItem[] {
  return (
    batchSceneCatalog.find((item) => item.category === category)?.scenes ??
    batchSceneCatalog[0].scenes
  )
}

export function getBatchSceneOptionId(category: string, sceneIndex: number): string {
  const scenes = getBatchScenesByCategory(category)
  return scenes[sceneIndex]?.optionId ?? scenes[0]?.optionId ?? 'white-studio'
}

export function getBatchSceneTitle(category: string, sceneIndex: number): string {
  const scenes = getBatchScenesByCategory(category)
  return scenes[sceneIndex]?.title ?? scenes[0]?.title ?? ''
}

export function getBatchSceneImageUrl(category: string, sceneIndex: number): string | undefined {
  const scenes = getBatchScenesByCategory(category)
  return scenes[sceneIndex]?.image ?? scenes[0]?.image
}

const beautyOptions = createOptions([
  [
    'balanced',
    '自然增强',
    'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=520&q=80',
  ],
  [
    'gloss',
    '高亮漆面',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=520&q=80',
  ],
  [
    'metal-wheel',
    '轮毂金属',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=520&q=80',
  ],
  [
    'clean-body',
    '车身洁净',
    'https://images.unsplash.com/photo-1555353540-64580b51c258?auto=format&fit=crop&w=520&q=80',
  ],
])

const interiorOptions = createOptions([
  [
    'dashboard',
    '仪表台增强',
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=520&q=80',
  ],
  [
    'seat-clean',
    '座椅清洁',
    'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=520&q=80',
  ],
  [
    'floor-clean',
    '地毯清洁',
    'https://images.unsplash.com/photo-1541443131876-44b03de101c5?auto=format&fit=crop&w=520&q=80',
  ],
  [
    'ambient-light',
    '氛围补光',
    'https://images.unsplash.com/photo-1600706432502-77a0e2e3275f?auto=format&fit=crop&w=520&q=80',
  ],
])

const watermarkOptions = createOptions([
  [
    'platform-mark',
    '平台角标',
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=520&q=80',
  ],
  [
    'text-watermark',
    '文字水印',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=520&q=80',
  ],
  [
    'account-badge',
    '账号标识',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=520&q=80',
  ],
  [
    'sticker-cover',
    '遮挡贴纸',
    'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=520&q=80',
  ],
])

const creativeImageOptions = createOptions([
  [
    'commerce-poster',
    '电商海报',
    'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=520&q=80',
  ],
  [
    'studio-realistic',
    '写实棚拍',
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=520&q=80',
  ],
  [
    'city-neon',
    '城市霓虹',
    'https://images.unsplash.com/photo-1485291571154-772bc14410bb?auto=format&fit=crop&w=520&q=80',
  ],
  [
    'minimal-white',
    '极简白底',
    'https://images.unsplash.com/photo-1583121274602-3e2820c58988?auto=format&fit=crop&w=520&q=80',
  ],
])

type CapabilityInput = Omit<
  WorkspaceCapability,
  'accept' | 'requiredLabel' | 'balance' | 'cost' | 'tutorial' | 'requirements'
> & { cost?: number }

const createCapability = (capability: CapabilityInput): WorkspaceCapability => ({
  ...capability,
  accept: 'image/jpeg,image/png,image/webp',
  requiredLabel: '必填',
  balance: 1250,
  cost: capability.cost ?? 30,
  tutorial,
  requirements: commonRequirements,
})

const sceneBlocks: WorkspaceCapabilityBlock[] = ['selector', 'scene-settings', 'actions']
const onlyActions: WorkspaceCapabilityBlock[] = ['actions']

export const workspaceCapabilities: WorkspaceCapability[] = [
  createCapability({
    code: 'showroom-light',
    apiCode: 'scene_showroom_light',
    kind: 'scene',
    groupTitle: '场景更换',
    icon: 'mdi:domain',
    label: '展厅棚拍',
    tag: '可用',
    tagType: 'success',
    title: '单张生成',
    description: '三档企业套餐均可使用，单张生成不占用图组并发额度。',
    uploadTitle: '车辆外观图',
    uploadHint: '点击/拖拽上传 · JPG / PNG / WebP · ≤ 10MB',
    selectorTitle: '场景选择',
    selectorTag: '展厅棚拍',
    middleBlocks: sceneBlocks,
    options: showroomOptions,
    actionLabel: '生成',
  }),
  createCapability({
    code: 'outdoor-scene',
    apiCode: 'scene_outdoor',
    kind: 'scene',
    groupTitle: '场景更换',
    icon: 'mdi:pine-tree',
    label: '户外实景',
    tag: '可用',
    tagType: 'success',
    title: '单张生成',
    description: '三档企业套餐均可使用，单张生成不占用图组并发额度。',
    uploadTitle: '车辆外观图',
    uploadHint: '点击/拖拽上传 · JPG / PNG / WebP · ≤ 10MB',
    selectorTitle: '场景选择',
    selectorTag: '户外实景',
    middleBlocks: sceneBlocks,
    options: outdoorOptions,
    actionLabel: '生成',
  }),
  createCapability({
    code: 'road-motion',
    apiCode: 'scene_road_motion',
    kind: 'scene',
    groupTitle: '场景更换',
    icon: 'mdi:road-variant',
    label: '行驶动效',
    tag: '可用',
    tagType: 'success',
    title: '单张生成',
    description: '上传车辆外观图，生成道路行驶感、速度感和动态背景素材。',
    uploadTitle: '车辆外观图',
    uploadHint: '车身完整入镜 · JPG / PNG / WebP',
    selectorTitle: '场景选择',
    selectorTag: '行驶动效',
    middleBlocks: sceneBlocks,
    options: roadOptions,
    actionLabel: '生成',
  }),
  createCapability({
    code: 'sky-studio',
    apiCode: 'scene_sky_studio',
    kind: 'scene',
    groupTitle: '场景更换',
    icon: 'mdi:weather-cloudy',
    label: '天空影棚',
    tag: '可用',
    tagType: 'success',
    title: '单张生成',
    description: '上传车辆外观图，替换天空氛围并保持车辆主体真实可信。',
    uploadTitle: '车辆外观图',
    uploadHint: '车身完整入镜 · JPG / PNG / WebP',
    selectorTitle: '场景选择',
    selectorTag: '天空影棚',
    middleBlocks: sceneBlocks,
    options: skyOptions,
    actionLabel: '生成',
  }),
  createCapability({
    code: 'paint-refresh',
    apiCode: 'beauty_paint_refresh',
    kind: 'beauty',
    groupTitle: '车辆美容',
    icon: 'mdi:spray',
    label: '烤漆翻新',
    tag: '演示',
    tagType: 'warning',
    title: '烤漆翻新',
    description: '上传车辆外观图，漆面亮度、轮毂金属质感与车身洁净度提升。',
    uploadTitle: '上传外观图',
    uploadHint: '车身完整入镜 · 漆面清晰 · JPG / PNG / WebP',
    selectorTitle: '效果强度',
    selectorTag: '车辆美容',
    middleBlocks: onlyActions,
    options: beautyOptions,
    actionLabel: '生成',
  }),
  createCapability({
    code: 'light-consistency',
    apiCode: 'beauty_light_consistency',
    kind: 'beauty',
    groupTitle: '车辆美容',
    icon: 'mdi:white-balance-sunny',
    label: '光污美化',
    tag: '演示',
    tagType: 'warning',
    title: '光污美化',
    description: '上传车辆外观图，弱化眩光、反光、色偏，让车辆光线更统一。',
    uploadTitle: '上传外观图',
    uploadHint: '建议选择反光明显或光线不均的车图',
    selectorTitle: '处理方向',
    selectorTag: '车辆美容',
    middleBlocks: onlyActions,
    options: beautyOptions,
    actionLabel: '生成',
  }),
  createCapability({
    code: 'interior-clean',
    apiCode: 'interior_clean',
    kind: 'interior',
    groupTitle: '车辆美容',
    icon: 'mdi:car-seat',
    label: '内饰清洁',
    tag: '演示',
    tagType: 'warning',
    title: '内饰清洁',
    description: '上传车辆内饰图，座椅、仪表台和地毯区域的清洁增强。',
    uploadTitle: '上传内饰图',
    uploadHint: '方向盘/座椅/中控尽量清晰 · JPG / PNG / WebP',
    selectorTitle: '清洁区域',
    selectorTag: '内饰',
    middleBlocks: onlyActions,
    options: interiorOptions,
    actionLabel: '生成',
  }),
  createCapability({
    code: 'interior-stitch',
    apiCode: 'interior-collage',
    kind: 'interior',
    groupTitle: '内饰',
    icon: 'mdi:image-multiple-outline',
    label: '内饰拼接',
    tag: 'Beta',
    tagType: 'info',
    title: '内饰拼接',
    description: '上传车辆内饰图，演示座椅、仪表台与地毯区域的拼接增强效果。',
    uploadTitle: '上传内饰图',
    uploadHint: '方向盘/座椅/中控尽量清晰 · JPG / PNG / WebP',
    selectorTitle: '拼接区域',
    selectorTag: '内饰',
    middleBlocks: onlyActions,
    options: interiorOptions,
    actionLabel: '生成效果图',
  }),
  createCapability({
    code: 'watermark-remove',
    apiCode: 'marketing_watermark_remove',
    kind: 'beauty',
    groupTitle: '营销工具',
    icon: 'mdi:water-off-outline',
    label: '去水印',
    tag: 'Beta',
    tagType: 'info',
    title: '去水印',
    description: '上传带平台水印的车图，智能去除角标、文字与遮挡痕迹，保留车辆与背景细节。',
    uploadTitle: '上传车图',
    uploadHint: '支持平台角标/文字水印车图 · JPG / PNG / WebP',
    selectorTitle: '水印类型',
    selectorTag: '营销',
    middleBlocks: onlyActions,
    options: watermarkOptions,
    actionLabel: '生成',
  }),
  createCapability({
    code: 'creative-image',
    apiCode: 'marketing_creative_image',
    kind: 'future',
    groupTitle: '营销工具',
    icon: 'mdi:image-edit-outline',
    label: '创意生图',
    tag: 'Beta',
    tagType: 'info',
    title: '创意生图',
    description: '用提示词生成营销海报、主图背景与广告创意图，支持多种输出比例。',
    uploadTitle: '参考图',
    uploadHint: '可选上传车辆或风格参考图 · JPG / PNG / WebP',
    selectorTitle: '风格模板',
    selectorTag: '创意',
    middleBlocks: onlyActions,
    options: creativeImageOptions,
    actionLabel: '生成创意图',
  }),
  createCapability({
    code: 'batch-new',
    apiCode: 'batch_listing',
    kind: 'batch',
    groupTitle: '智能交付',
    icon: 'mdi:package-variant-closed',
    label: '批量上新',
    tag: '套餐高阶',
    tagType: 'info',
    title: '批量上新',
    description: '上传批量车源素材，按企业套餐能力进行任务队列处理。',
    uploadTitle: '上传车源包',
    uploadHint: 'ZIP / CSV / 图片包 · 后续接入批量任务接口',
    selectorTitle: '批量模板',
    selectorTag: '批量',
    middleBlocks: ['selector', 'actions'],
    options: showroomOptions,
    actionLabel: '创建任务',
  }),
  createCapability({
    code: 'delivery',
    apiCode: 'asset_delivery',
    kind: 'delivery',
    groupTitle: '智能交付',
    icon: 'mdi:folder-multiple-outline',
    label: '成片交付',
    tag: '可用',
    tagType: 'success',
    title: '成片交付',
    description: '管理已生成素材，按车源、场景、平台规格进行打包交付。',
    uploadTitle: '选择素材',
    uploadHint: '从生成记录或本地文件选择交付素材',
    selectorTitle: '交付规格',
    selectorTag: '交付',
    middleBlocks: ['selector'],
    options: showroomOptions,
    actionLabel: '生成交付包',
  }),
  createCapability({
    code: 'short-video',
    apiCode: 'short-video',
    kind: 'future',
    groupTitle: '营销工具',
    icon: 'mdi:movie-open-outline',
    label: '短视频生成',
    tag: 'Beta',
    tagType: 'info',
    title: '短视频生成',
    description: '由静态车图生成 10 秒营销短视频素材，默认输出 16:9、720p。',
    uploadTitle: '车辆外观图',
    uploadHint: '点击/拖拽上传 · JPG / PNG / WebP · ≤ 10MB',
    middleBlocks: onlyActions,
    options: showroomOptions,
    actionLabel: '生成短视频',
    cost: 4000,
  }),
]

export const defaultWorkspaceCapabilityCode = 'showroom-light'

const showroomTutorialImageByTitle: Record<string, string> = {
  经典白棚: showroomTutorialClassicWhite,
  玻璃展厅: showroomTutorialGlass,
  暗调奢华: showroomTutorialLuxuryDark,
  柔光灯顶: showroomTutorialSoftTop,
}

const showroomTemplateRecommendations: WorkspaceTemplateRecommendation[] =
  showroomOptions.slice(0, 4).map((option) => ({
    title: option.title,
    capabilityCode: 'showroom-light',
    optionId: option.id,
    image: showroomTutorialImageByTitle[option.title] ?? option.image,
  }))

const outdoorTutorialImageByTitle: Record<string, string> = {
  林荫公园: outdoorTutorialTreePark,
  山野湖畔: outdoorTutorialMountainLake,
  城市街区: outdoorTutorialCityBlock,
  海滨城市: outdoorTutorialCoastDaylight,
}

const outdoorTemplateRecommendations: WorkspaceTemplateRecommendation[] =
  outdoorOptions.slice(0, 4).map((option) => ({
    title: option.title,
    capabilityCode: 'outdoor-scene',
    optionId: option.id,
    image: outdoorTutorialImageByTitle[option.title] ?? option.image,
  }))

const skyTutorialImageByTitle: Record<string, string> = {
  天空镜场: skyTutorialMirrorField,
  夕阳车镜: skyTutorialSunsetDrive,
  云海展台: skyTutorialCloudSeaStage,
  云镜车场: skyTutorialCloudParking,
}

const skyTemplateRecommendations: WorkspaceTemplateRecommendation[] =
  skyOptions.slice(0, 4).map((option) => ({
    title: option.title,
    capabilityCode: 'sky-studio',
    optionId: option.id,
    image: skyTutorialImageByTitle[option.title] ?? option.image,
  }))

const roadTutorialImageByTitle: Record<string, string> = {
  城市主干道: roadTutorialCityDay,
  夕阳高速: roadTutorialHighwaySunset,
  傍晚高架: roadTutorialOverpassDusk,
  商务园区: roadTutorialBusinessPark,
}

const roadTemplateRecommendations: WorkspaceTemplateRecommendation[] = roadOptions
  .slice(0, 4)
  .map((option) => ({
    title: option.title,
    capabilityCode: 'road-motion',
    optionId: option.id,
    image: roadTutorialImageByTitle[option.title] ?? option.image,
  }))

export const workspaceTemplateRecommendations: WorkspaceTemplateRecommendation[] = [
  ...showroomTemplateRecommendations,
  ...outdoorTemplateRecommendations,
  ...roadTemplateRecommendations,
  ...skyTemplateRecommendations,
]

function menuTagVariant(
  tag: string,
  tagType: WorkspaceCapability['tagType'],
): WorkspaceMenuItem['tagVariant'] {
  if (tag === 'Beta') return 'beta'
  if (tag === '规划中') return 'planned'
  if (tagType === 'success') return 'available'
  if (tagType === 'warning') return 'demo'
  if (tagType === 'info') return 'package'
  return 'planned'
}

function toMenuItem(capability: WorkspaceCapability): WorkspaceMenuItem {
  return {
    code: capability.code,
    icon: capability.icon,
    label: capability.label,
    tag: capability.tag,
    tagType: capability.tagType,
    tagVariant: menuTagVariant(capability.tag, capability.tagType),
  }
}

function pickMenuItems(codes: string[]): WorkspaceMenuItem[] {
  return codes
    .map((code) => workspaceCapabilities.find((item) => item.code === code))
    .filter((item): item is WorkspaceCapability => Boolean(item))
    .map(toMenuItem)
}

const futureSidebarItems: WorkspaceMenuItem[] = [
  {
    code: 'future-main-template',
    icon: 'mdi:puzzle-outline',
    label: '主图套版',
    tag: '规划中',
    tagVariant: 'planned',
    disabled: true,
  },
  {
    code: 'short-video',
    icon: 'mdi:movie-open-outline',
    label: '短视频生成',
    tag: 'Beta',
    tagVariant: 'beta',
  },
  {
    code: 'future-detail-page',
    icon: 'mdi:file-document-outline',
    label: '详情页物料',
    tag: '规划中',
    tagVariant: 'planned',
    disabled: true,
  },
  {
    code: 'future-distribution',
    icon: 'mdi:bullhorn-outline',
    label: '多平台分发',
    tag: '规划中',
    tagVariant: 'planned',
    disabled: true,
  },
]

export const workspaceMenuGroups: WorkspaceMenuGroup[] = [
  {
    title: '场景更换',
    items: pickMenuItems([
      'showroom-light',
      'outdoor-scene',
      'road-motion',
      'sky-studio',
    ]),
  },
  {
    title: '车辆美容',
    items: pickMenuItems([
      'paint-refresh',
      'light-consistency',
      'interior-clean',
    ]),
  },
  {
    title: '智能交付',
    items: pickMenuItems(['batch-new', 'delivery']),
  },
  {
    title: '营销工具',
    items: [...pickMenuItems(['watermark-remove', 'creative-image']), ...futureSidebarItems],
  },
]
