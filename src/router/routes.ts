import type { RouteRecordRaw } from 'vue-router'

import { WORKSPACE_DEFAULT_CAPABILITY } from '@/constants/app-flow'
import BackOfficeLayout from '@/layouts/BackOfficeLayout.vue'
import BasicLayout from '@/layouts/BasicLayout.vue'
import BackOfficeLoginPage from '@/pages/back-office-login/index.vue'
import CreditsAdminPage from '@/pages/credits-admin/index.vue'

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
        path: 'reusable-credits-console',
        redirect: '/back-office',
      },
      {
        path: 'credits-admin',
        redirect: '/back-office',
      },
    ],
  },
  {
    path: '/back-office/login',
    name: 'BackOfficeLogin',
    component: BackOfficeLoginPage,
    meta: {
      title: '积分后台登录',
      guestOnly: true,
      backOffice: true,
    },
  },
  {
    path: '/back-office',
    component: BackOfficeLayout,
    meta: {
      requiresAuth: true,
      permission: 'menu:admin',
      backOffice: true,
    },
    children: [
      {
        path: '',
        name: 'ReusableCreditsConsole',
        component: CreditsAdminPage,
        meta: {
          title: 'Reusable Credits Platform Console',
          requiresAuth: true,
          permission: 'menu:admin',
          backOffice: true,
        },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home',
  },
]
