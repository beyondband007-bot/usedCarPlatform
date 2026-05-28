/**
 * 产品流程目录（访客首页 → 企业视觉工作台）
 *
 * 访客（顶栏：首页 / 企业套餐 / 视觉工作台）
 * ├─ 点击视觉工作台（顶栏或首页 CTA）→ 登录引导弹窗 → /auth 登录 / 稍后再说
 * ├─ 点击企业套餐 → /pricing
 * └─ 浏览案例与能力介绍
 *
 * 企业用户（二级导航：首页 / 视觉工作台 / 积分查询 / 套餐·积分）
 * ├─ 场景影棚能力（单图生成）
 * ├─ 批量上新
 * └─ 成片交付
 */

export const AUTH_ROUTE = '/auth'

export const WORKSPACE_ROUTE = '/workspace'

export const WORKSPACE_DEFAULT_CAPABILITY = 'showroom-light'

/** 工作台业务模块（与左侧子菜单分组对应） */
export const workspaceFlowModules = [
  {
    id: 'scene',
    title: '场景影棚',
    description: '上传外观图 · 选场景与 Logo · 单图生成',
    defaultCapabilityCode: 'showroom-light',
    capabilityCodes: [
      'showroom-light',
      'outdoor-scene',
      'road-motion',
      'sky-studio',
    ],
  },
  {
    id: 'beauty',
    title: '车辆美容',
    description: '烤漆翻新 · 光污一致化',
    defaultCapabilityCode: 'paint-refresh',
    capabilityCodes: ['paint-refresh', 'light-consistency'],
  },
  {
    id: 'interior',
    title: '内饰',
    description: '内饰清洁增强',
    defaultCapabilityCode: 'interior-clean',
    capabilityCodes: ['interior-clean'],
  },
  {
    id: 'batch-delivery',
    title: '批量 & 交付',
    description: '批量上新任务 · 成片交付包',
    defaultCapabilityCode: 'batch-new',
    capabilityCodes: ['batch-new', 'delivery'],
  },
] as const

export type WorkspaceFlowModuleId = (typeof workspaceFlowModules)[number]['id']
