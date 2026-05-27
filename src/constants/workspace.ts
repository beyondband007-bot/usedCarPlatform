import type { WorkspaceCapability, WorkspaceMenuGroup } from '@/types/workspace'

const tutorial = [
  {
    title: '上传车图',
    image: 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=360&q=80',
  },
  {
    title: '选择模板',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=360&q=80',
  },
  { title: '选择 Logo', text: '宇昊名车' },
  {
    title: '生成效果',
    image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=360&q=80',
  },
]

const recent = [
  {
    id: 'recent-1',
    title: '经典白棚生成任务',
    status: 'success',
    createdAt: '2026-05-20 09:32',
    thumbnail:
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=220&q=80',
  },
  {
    id: 'recent-2',
    title: '烤漆翻新演示',
    status: 'generating',
    createdAt: '2026-05-20 09:18',
    thumbnail:
      'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=220&q=80',
  },
] satisfies WorkspaceCapability['recent']

const commonRequirements = ['车辆完整入镜', '画面清晰无遮挡', '光线均匀少反光']

const showroomOptions = [
  {
    id: 'white-studio',
    title: '经典白棚',
    image:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'glass-hall',
    title: '玻璃展厅',
    image:
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'luxury-dark',
    title: '暗调豪华',
    image:
      'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'soft-top-light',
    title: '柔光顶灯',
    image:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=520&q=80',
  },
]

const outdoorOptions = [
  {
    id: 'tree-park',
    title: '林荫公园',
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'mountain-lake',
    title: '山野湖畔',
    image:
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'city-block',
    title: '城市街区',
    image:
      'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'coast-daylight',
    title: '海边日光',
    image:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=520&q=80',
  },
]

const roadOptions = [
  {
    id: 'urban-road',
    title: '城市公路',
    image:
      'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'bridge-motion',
    title: '高架动态',
    image:
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'night-road',
    title: '夜景车流',
    image:
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'highway',
    title: '高速驰行',
    image:
      'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?auto=format&fit=crop&w=520&q=80',
  },
]

const skyOptions = [
  {
    id: 'clear-sky',
    title: '晴空蓝天',
    image:
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'sunset',
    title: '落日金辉',
    image:
      'https://images.unsplash.com/photo-1501973801540-537f08ccae7b?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'cloudy',
    title: '柔云漫射',
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'night-sky',
    title: '夜幕星光',
    image:
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=520&q=80',
  },
]

const beautyOptions = [
  {
    id: 'balanced',
    title: '自然增强',
    image:
      'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'gloss',
    title: '高亮漆面',
    image:
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'metal-wheel',
    title: '轮毂金属',
    image:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'clean-body',
    title: '车身洁净',
    image:
      'https://images.unsplash.com/photo-1555353540-64580b51c258?auto=format&fit=crop&w=520&q=80',
  },
]

const interiorOptions = [
  {
    id: 'dashboard',
    title: '仪表台增强',
    image:
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'seat-clean',
    title: '座椅清洁',
    image:
      'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'floor-clean',
    title: '地毯清洁',
    image:
      'https://images.unsplash.com/photo-1541443131876-44b03de101c5?auto=format&fit=crop&w=520&q=80',
  },
  {
    id: 'ambient-light',
    title: '氛围补光',
    image:
      'https://images.unsplash.com/photo-1600706432502-77a0e2e3275f?auto=format&fit=crop&w=520&q=80',
  },
]

const createCapability = (
  capability: Omit<WorkspaceCapability, 'accept' | 'requiredLabel' | 'balance' | 'cost' | 'tutorial' | 'recent' | 'requirements'>
): WorkspaceCapability => ({
  ...capability,
  accept: 'image/jpeg,image/png,image/webp',
  requiredLabel: '必选',
  balance: 1250,
  cost: 15,
  tutorial,
  recent,
  requirements: commonRequirements,
})

export const workspaceCapabilities: WorkspaceCapability[] = [
  createCapability({
    code: 'showroom-light',
    apiCode: 'scene_showroom_light',
    kind: 'scene',
    groupTitle: '场景影棚',
    icon: '🏢',
    label: '展厅灯光',
    tag: '可用',
    tagType: 'success',
    title: '单张生成',
    description: '三档企业套餐均可使用，单张生成不占用图组并发额度。',
    uploadTitle: '车辆外观图',
    uploadHint: '点击/拖拽上传 · JPG / PNG / WebP · ≤10MB',
    selectorTitle: '场景选择',
    selectorTag: '展厅灯光',
    options: showroomOptions,
    actionLabel: '生成',
  }),
  createCapability({
    code: 'outdoor-scene',
    apiCode: 'scene_outdoor',
    kind: 'scene',
    groupTitle: '场景影棚',
    icon: '🌳',
    label: '户外场景',
    tag: '可用',
    tagType: 'success',
    title: '单张生成',
    description: '三档企业套餐均可使用，单张生成不占用图组并发额度。',
    uploadTitle: '车辆外观图',
    uploadHint: '点击/拖拽上传 · JPG / PNG / WebP · ≤10MB',
    selectorTitle: '场景选择',
    selectorTag: '户外场景',
    options: outdoorOptions,
    actionLabel: '生成',
  }),
  createCapability({
    code: 'road-motion',
    apiCode: 'scene_road_motion',
    kind: 'scene',
    groupTitle: '场景影棚',
    icon: '🛣️',
    label: '道路动态',
    tag: '可用',
    tagType: 'success',
    title: '单张生成',
    description: '上传车辆外观图，生成道路行驶感、速度感和动态背景素材。',
    uploadTitle: '车辆外观图',
    uploadHint: '车身完整入镜 · JPG / PNG / WebP',
    selectorTitle: '场景选择',
    selectorTag: '道路动态',
    options: roadOptions,
    actionLabel: '生成',
  }),
  createCapability({
    code: 'sky-studio',
    apiCode: 'scene_sky_studio',
    kind: 'scene',
    groupTitle: '场景影棚',
    icon: '☁️',
    label: '天空影棚',
    tag: '可用',
    tagType: 'success',
    title: '单张生成',
    description: '上传车辆外观图，替换天空氛围并保持车辆主体真实可信。',
    uploadTitle: '车辆外观图',
    uploadHint: '车身完整入镜 · JPG / PNG / WebP',
    selectorTitle: '场景选择',
    selectorTag: '天空影棚',
    options: skyOptions,
    actionLabel: '生成',
  }),
  createCapability({
    code: 'paint-refresh',
    apiCode: 'beauty_paint_refresh',
    kind: 'beauty',
    groupTitle: '车辆美容',
    icon: '✨',
    label: '烤漆翻新',
    tag: '演示',
    tagType: 'warning',
    title: '烤漆翻新',
    description: '上传车辆外观图，演示漆面亮度、轮毂金属质感与车身洁净度提升。',
    uploadTitle: '上传外观图',
    uploadHint: '车身完整入镜 · 漆面清晰 · JPG / PNG / WebP',
    selectorTitle: '效果强度',
    selectorTag: '车辆美容',
    options: beautyOptions,
    actionLabel: '生成 演示',
  }),
  createCapability({
    code: 'light-consistency',
    apiCode: 'beauty_light_consistency',
    kind: 'beauty',
    groupTitle: '车辆美容',
    icon: '☀️',
    label: '光污一致化',
    tag: '演示',
    tagType: 'warning',
    title: '光污一致化',
    description: '上传车辆外观图，演示弱化眩光、反光、色偏，让车辆光线更统一。',
    uploadTitle: '上传外观图',
    uploadHint: '建议选择反光明显或光线不均的车图',
    selectorTitle: '处理方向',
    selectorTag: '车辆美容',
    options: beautyOptions,
    actionLabel: '生成 演示',
  }),
  createCapability({
    code: 'interior-clean',
    apiCode: 'interior_clean',
    kind: 'interior',
    groupTitle: '内饰',
    icon: '🪑',
    label: '内饰清洁',
    tag: '演示',
    tagType: 'warning',
    title: '内饰清洁',
    description: '上传车辆内饰图，演示座椅、仪表台和地毯区域的清洁增强。',
    uploadTitle: '上传内饰图',
    uploadHint: '方向盘/座椅/中控尽量清晰 · JPG / PNG / WebP',
    selectorTitle: '清洁区域',
    selectorTag: '内饰',
    options: interiorOptions,
    actionLabel: '生成 演示',
  }),
  createCapability({
    code: 'batch-new',
    apiCode: 'batch_listing',
    kind: 'batch',
    groupTitle: '批量 & 交付',
    icon: '📦',
    label: '批量上新',
    tag: '套餐商价',
    tagType: 'info',
    title: '批量上新',
    description: '上传批量车源素材，按企业套餐能力进行任务队列处理。',
    uploadTitle: '上传车源包',
    uploadHint: 'ZIP / CSV / 图片包 · 后续接入批量任务接口',
    selectorTitle: '批量模板',
    selectorTag: '批量',
    options: showroomOptions,
    actionLabel: '创建任务',
  }),
  createCapability({
    code: 'delivery',
    apiCode: 'asset_delivery',
    kind: 'delivery',
    groupTitle: '批量 & 交付',
    icon: '📁',
    label: '成片交付',
    tag: '可用',
    tagType: 'success',
    title: '成片交付',
    description: '管理已生成素材，按车源、场景、平台规格进行打包交付。',
    uploadTitle: '选择素材',
    uploadHint: '从生成记录或本地文件选择交付素材',
    selectorTitle: '交付规格',
    selectorTag: '交付',
    options: showroomOptions,
    actionLabel: '生成交付包',
  }),
]

export const defaultWorkspaceCapabilityCode = 'showroom-light'

export const workspaceMenuGroups: WorkspaceMenuGroup[] = workspaceCapabilities.reduce<WorkspaceMenuGroup[]>(
  (groups, capability) => {
    const targetGroup = groups.find((group) => group.title === capability.groupTitle)

    const item = {
      code: capability.code,
      icon: capability.icon,
      label: capability.label,
      tag: capability.tag,
      tagType: capability.tagType,
    }

    if (targetGroup) {
      targetGroup.items.push(item)
    } else {
      groups.push({
        title: capability.groupTitle,
        items: [item],
      })
    }

    return groups
  },
  []
)
