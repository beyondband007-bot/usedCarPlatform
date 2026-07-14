<script lang="ts" setup>
import { ref } from 'vue'
import { createLot } from '@/api/lot'

definePage({
  style: {
    navigationBarTitleText: '新增车场',
  },
})

const name = ref('')
const address = ref('')
const remark = ref('')
const saving = ref(false)

async function submit() {
  const lotName = name.value.trim()
  if (!lotName) {
    uni.showToast({ title: '请输入车场名称', icon: 'none' })
    return
  }
  if (saving.value)
    return

  saving.value = true
  try {
    const lot = await createLot({
      name: lotName,
      address: address.value.trim() || null,
      remark: remark.value.trim() || null,
    })
    uni.showToast({ title: '车场已创建', icon: 'success' })
    uni.redirectTo({ url: `/pages/lot/capture?lotId=${lot.id}` })
  }
  catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : '车场创建失败，请稍后重试',
      icon: 'none',
    })
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <view class="min-h-screen bg-[#F5F7FA] px-3 pt-3">
    <view class="pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
    <view class="rounded-3 bg-white p-4">
      <view class="mb-3 flex items-start gap-3">
        <view class="h-7 w-7 flex shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-3.5 text-[#2563EB] font-700">
          1
        </view>
        <view>
          <view class="text-4 text-[#111827] font-700">
            车场基础信息
          </view>
          <view class="mt-1 text-3 text-[#64748B]">
            创建后继续拍摄并上传车场图片和视频，素材会同步保存到车辆库。
          </view>
        </view>
      </view>

      <view class="space-y-3">
        <view>
          <view class="mb-1 text-3.5 text-[#475569]">
            车场名称 <text class="text-[#EF4444]">*</text>
          </view>
          <input
            v-model="name"
            class="h-11 rounded-2 border border-[#CBD5E1] bg-white px-3 text-3.5 text-[#111827]"
            :maxlength="80"
            placeholder="请输入车场名称"
          >
        </view>

        <view>
          <view class="mb-1 text-3.5 text-[#475569]">车场地址</view>
          <input
            v-model="address"
            class="h-11 rounded-2 border border-[#CBD5E1] bg-white px-3 text-3.5 text-[#111827]"
            :maxlength="160"
            placeholder="请输入车场地址"
          >
        </view>

        <view>
          <view class="mb-1 text-3.5 text-[#475569]">备注</view>
          <textarea
            v-model="remark"
            class="h-20 w-full rounded-2 border border-[#CBD5E1] bg-white p-3 text-3.5 text-[#111827]"
            :maxlength="500"
            placeholder="选填，可补充车场说明"
          />
        </view>
      </view>
    </view>
    <button
      class="mt-3 h-12 w-full rounded-2 text-4 text-white"
      :class="saving ? 'bg-[#93C5FD]' : 'bg-[#3B82F6]'"
      :disabled="saving"
      @click="submit"
    >
      {{ saving ? '创建中…' : '创建并上传素材' }}
    </button>
    </view>
  </view>
</template>
