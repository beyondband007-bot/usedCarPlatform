import type { RouteRecordRaw } from 'vue-router'

import { WORKSPACE_DEFAULT_CAPABILITY } from '@/constants/app-flow'
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue'
import BasicLayout from '@/layouts/BasicLayout.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/intro-video',
    name: 'IntroVideo',
    component: () => import('@/pages/intro-video/index.vue'),
    meta: {
      title: '首页视频',
      hideIntroVideo: true,
    },
  },
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
          permission: 'menu:home',
        },
      },
      {
        path: 'pricing',
        name: 'Pricing',
        component: () => import('@/pages/pricing/index.vue'),
        meta: {
          title: '企业套餐',
          permission: 'menu:pricing',
        },
      },
      {
        path: 'login',
        name: 'Login',
        component: () => import('@/pages/enterprise/index.vue'),
        meta: {
          title: '企业账号登录',
          guestOnly: true,
          hideIntroVideo: true,
        },
      },
      {
        path: 'auth',
        redirect: '/login',
      },
      {
        path: 'enterprise',
        redirect: '/login',
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
              title: 'AI工作台',
              requiresAuth: true,
              permission: 'menu:workspace',
            },
          },
          {
            path: 'credits',
            name: 'Credits',
            component: () => import('@/pages/points/index.vue'),
            meta: {
              title: '积分查询',
              requiresAuth: true,
              permission: 'menu:points',
            },
          },
          {
            path: 'points',
            redirect: '/credits',
          },
          {
            path: 'package-points',
            name: 'PackagePoints',
            component: () => import('@/pages/package-points/index.vue'),
            meta: {
              title: '套餐/积分',
              requiresAuth: true,
              permission: 'menu:recharge',
            },
          },
          {
            path: 'recharge',
            redirect: '/package-points',
          },
          {
            path: 'credits-admin',
            name: 'CreditsAdmin',
            component: () => import('@/pages/credits-admin/index.vue'),
            meta: {
              title: '积分后台',
              requiresAuth: true,
              permission: 'menu:admin',
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
