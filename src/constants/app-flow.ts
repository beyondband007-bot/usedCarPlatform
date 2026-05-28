/**
 * 产品流程目录（访客首页 → 企业视觉工作台）
 *
 * 访客进入首页
 * ├─ 点击视觉工作台 CTA → 访客浮层 → 企业登录 / 稍后再说
 * ├─ 点击企业套餐 → /pricing
 * └─ 浏览案例与能力介绍
 *
 * 企业用户进入视觉工作台
 * ├─ 场景影棚能力（单图生成）
 * ├─ 批量上新
 * └─ 成片交付
 */

export const AUTH_ROUTE = '/auth'

export const WORKSPACE_ROUTE = '/workspace'

export const WORKSPACE_DEFAULT_CAPABILITY = 'showroom-light'

/** 工作台三大模块 */
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
      'paint-refresh',
      'light-consistency',
      'interior-clean',
    ],
  },
  {
    id: 'batch',
    title: '批量上新',
    description: '项目信息 · 图组上传 · 视觉预设 · 创建批量任务',
    defaultCapabilityCode: 'batch-new',
    capabilityCodes: ['batch-new'],
  },
  {
    id: 'delivery',
    title: '成片交付',
    description: '任务列表 · 预览切换 · 批量下载与删除',
    defaultCapabilityCode: 'delivery',
    capabilityCodes: ['delivery'],
  },
] as const

export type WorkspaceFlowModuleId = (typeof workspaceFlowModules)[number]['id']
