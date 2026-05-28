import type { RouteRecordRaw } from 'vue-router'

import { WORKSPACE_DEFAULT_CAPABILITY } from '@/constants/app-flow'
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue'
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
        path: 'auth',
        name: 'Auth',
        component: () => import('@/pages/enterprise/index.vue'),
        meta: {
          title: '企业账号登录',
          description: '企业账号登录',
          guestOnly: true,
        },
      },
      {
        path: 'enterprise',
        redirect: '/auth',
      },
      {
        path: '',
        component: AuthenticatedLayout,
        meta: {
          requiresAuth: true,
        },
        children: [
          {
            path: 'workspace',
            redirect: {
              name: 'Workspace',
              params: { code: WORKSPACE_DEFAULT_CAPABILITY },
            },
          },
          {
            path: 'workspace/:code',
            name: 'Workspace',
            component: () => import('@/pages/workspace/index.vue'),
            meta: {
              title: '视觉工作台',
              description: '场景影棚 · 批量上新 · 成片交付',
              requiresAuth: true,
            },
          },
          {
            path: 'credits',
            name: 'Credits',
            component: () => import('@/pages/credits/index.vue'),
            meta: {
              title: '积分查询',
              description: '积分流水查询',
              requiresAuth: true,
              hiddenNav: true,
            },
          },
          {
            path: 'package-points',
            name: 'PackagePoints',
            component: () => import('@/pages/package-points/index.vue'),
            meta: {
              title: '套餐/积分',
              description: '当前套餐和积分概览',
              requiresAuth: true,
              hiddenNav: true,
            },
          },
        ],
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home',
  },
]
