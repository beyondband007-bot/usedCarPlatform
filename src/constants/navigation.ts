export interface NavigationItem {
  path: string
  label: string
  description: string
}

export const mainNavigation: NavigationItem[] = [
  {
    path: '/home',
    label: '首页',
    description: '平台能力概览',
  },
  {
    path: '/workspace',
    label: '内容工作台',
    description: 'AI 图片生成核心',
  },
  {
    path: '/batch',
    label: '批量生成',
    description: '批量任务处理',
  },
  {
    path: '/history',
    label: '生成记录',
    description: 'AI 生成历史',
  },
  {
    path: '/pricing',
    label: '企业套餐',
    description: '套餐与积分体系',
  },
  {
    path: '/points',
    label: '积分系统',
    description: '积分消耗明细',
  },
  {
    path: '/login',
    label: '企业账号',
    description: '成员与权限管理',
  },
]
