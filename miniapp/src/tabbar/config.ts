import type { TabBar } from '@uni-helper/vite-plugin-uni-pages'
import type { CustomTabBarItem, NativeTabBarItem } from './types'

export const TABBAR_STRATEGY_MAP = {
  NO_TABBAR: 0,
  NATIVE_TABBAR: 1,
  CUSTOM_TABBAR: 2,
}

export const selectedTabbarStrategy = TABBAR_STRATEGY_MAP.CUSTOM_TABBAR

export const nativeTabbarList: NativeTabBarItem[] = [
  {
    iconPath: 'static/tabbar/home.png',
    selectedIconPath: 'static/tabbar/homeHL.png',
    pagePath: 'pages/home/index',
    text: '首页',
  },
  {
    iconPath: 'static/tabbar/example.png',
    selectedIconPath: 'static/tabbar/exampleHL.png',
    pagePath: 'pages/vehicle/list',
    text: '车辆',
  },
  {
    iconPath: 'static/tabbar/example.png',
    selectedIconPath: 'static/tabbar/exampleHL.png',
    pagePath: 'pages/lot/list',
    text: '车场',
  },
  {
    iconPath: 'static/tabbar/personal.png',
    selectedIconPath: 'static/tabbar/personalHL.png',
    pagePath: 'pages/user/index',
    text: '我的',
  },
]

export const customTabbarList: CustomTabBarItem[] = [
  {
    text: '首页',
    pagePath: 'pages/home/index',
    iconType: 'unocss',
    icon: 'i-carbon-home',
  },
  {
    pagePath: 'pages/vehicle/list',
    text: '车辆',
    iconType: 'unocss',
    icon: 'i-carbon-car',
  },
  {
    pagePath: 'pages/lot/list',
    text: '车场',
    iconType: 'unocss',
    icon: 'i-carbon-garage',
  },
  {
    pagePath: 'pages/user/index',
    text: '我的',
    iconType: 'unocss',
    icon: 'i-carbon-user',
  },
]

export const tabbarCacheEnable
  = [TABBAR_STRATEGY_MAP.NATIVE_TABBAR, TABBAR_STRATEGY_MAP.CUSTOM_TABBAR].includes(selectedTabbarStrategy)
export const customTabbarEnable = selectedTabbarStrategy === TABBAR_STRATEGY_MAP.CUSTOM_TABBAR
export const needHideNativeTabbar = customTabbarEnable
export const tabbarList = customTabbarEnable ? customTabbarList : nativeTabbarList
export const isNativeTabbar = selectedTabbarStrategy === TABBAR_STRATEGY_MAP.NATIVE_TABBAR

const pageList = tabbarList.map(item => ({
  text: item.text,
  pagePath: item.pagePath,
}))

const config: TabBar = {
  custom: customTabbarEnable,
  color: '#6B7280',
  selectedColor: '#3B82F6',
  backgroundColor: '#FFFFFF',
  borderStyle: 'black',
  height: '50px',
  fontSize: '10px',
  iconWidth: '24px',
  spacing: '3px',
  list: pageList as TabBar['list'],
}

export const tabBar = tabbarCacheEnable ? config : undefined
