import type { RouteRecordRaw } from 'vue-router'

import BasicLayout from '@/layouts/BasicLayout.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: BasicLayout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/pages/home/index.vue'),
        meta: {
          title: '首页',
          description: '平台展示、能力介绍',
        },
      },
      {
        path: 'pricing',
        name: 'Pricing',
        component: () => import('@/pages/pricing/index.vue'),
        meta: {
          title: '企业套餐',
          description: '套餐购买、积分体系',
        },
      },
      {
        path: 'workspace',
        name: 'Workspace',
        component: () => import('@/pages/workspace/index.vue'),
        meta: {
          title: '视觉工作台',
          description: 'AI 图片生成核心',
        },
      },
      {
        path: 'credits',
        name: 'Credits',
        component: () => import('@/pages/credits/index.vue'),
        meta: {
          title: '积分查询',
          description: '积分流水查询',
        },
      },
      {
        path: 'enterprise',
        name: 'Enterprise',
        component: () => import('@/pages/enterprise/index.vue'),
        meta: {
          title: '企业账号登录',
          description: '企业账号登录',
        },
      },
      {
        path: 'package-points',
        name: 'PackagePoints',
        component: () => import('@/pages/package-points/index.vue'),
        meta: {
          title: '套餐/积分',
          description: '当前套餐和积分概览',
        },
      },
      {
        path: 'visitor-layer',
        name: 'VisitorLayer',
        component: () => import('@/pages/visitor-layer/index.vue'),
        meta: {
          title: '访客浮层',
          description: '访客引导浮层',
        },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home',
  },
]
