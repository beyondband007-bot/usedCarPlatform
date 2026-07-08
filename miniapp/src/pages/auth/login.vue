<script lang="ts" setup>
import { nextTick, ref } from 'vue'
import { HOME_PAGE } from '@/utils'
import { LOGIN_PAGE } from '@/router/config'
import { isPageTabbar } from '@/tabbar/store'
import { useTokenStore } from '@/store/token'

definePage({
  excludeLoginPath: true,
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '登录',
  },
})

const tokenStore = useTokenStore()
const loading = ref(false)
const username = ref('')
const password = ref('')
const redirectUrl = ref(HOME_PAGE)

onLoad((query: Record<string, string | undefined>) => {
  if (query?.redirect) {
    redirectUrl.value = decodeURIComponent(query.redirect)
  }
})

async function goAfterLogin() {
  await nextTick()
  const url = !redirectUrl.value || redirectUrl.value.split('?')[0] === LOGIN_PAGE
    ? HOME_PAGE
    : redirectUrl.value
  const target = url.split('?')[0]
  if (isPageTabbar(target)) {
    uni.reLaunch({ url: target })
    return
  }
  uni.redirectTo({ url })
}

async function handlePasswordLogin() {
  if (loading.value) {
    return
  }
  if (!username.value.trim() || !password.value) {
    uni.showToast({
      title: '请输入账号和密码',
      icon: 'none',
    })
    return
  }

  loading.value = true
  try {
    await tokenStore.login({
      username: username.value.trim(),
      password: password.value,
    })
    goAfterLogin()
  }
  catch {
    // store 已经给出登录失败提示，这里只吞掉错误，避免 Vue 原生事件报 unhandled。
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="min-h-screen flex flex-col bg-[#F5F7FA] px-6 pb-10 pt-10">
    <view class="flex flex-col items-center text-center">
      <view class="mb-4 h-16 w-16 flex items-center justify-center rounded-3 bg-[#3B82F6] text-8 text-white font-700 shadow-sm">
        车
      </view>
      <view class="text-7 text-[#111827] font-700">
        素材采集
      </view>
      <view class="mt-2 whitespace-nowrap text-3 text-[#6B7280]">
        登录后拍摄车辆与车场素材，并同步上传至车辆库
      </view>
    </view>

    <view class="mt-10 rounded-3 bg-white p-5 shadow-sm">
      <view class="mb-4 text-4 text-[#111827] font-600">
        账号登录
      </view>

      <view class="mb-3 text-3.5 text-[#6B7280]">
        账号
      </view>
      <input
        v-model="username"
        class="mb-4 h-11 rounded-2 bg-[#F9FAFB] px-3 text-4 text-[#111827]"
        placeholder="请输入账号"
        placeholder-class="text-[#9CA3AF]"
        confirm-type="next"
      >

      <view class="mb-3 text-3.5 text-[#6B7280]">
        密码
      </view>
      <input
        v-model="password"
        class="mb-5 h-11 rounded-2 bg-[#F9FAFB] px-3 text-4 text-[#111827]"
        password
        placeholder="请输入密码"
        placeholder-class="text-[#9CA3AF]"
        confirm-type="done"
        @confirm="handlePasswordLogin"
      >

      <button
        class="h-11 w-full rounded-2 bg-[#3B82F6] text-4 text-white font-500"
        :disabled="loading"
        :loading="loading"
        @click="handlePasswordLogin"
      >
        登录
      </button>
    </view>
  </view>
</template>
