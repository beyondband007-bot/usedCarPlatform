<script lang="ts" setup>
import type { VehicleBasicInfo } from '@/api/vehicle-info'
import { computed, reactive, ref, watch } from 'vue'
import { createVehicle } from '@/api/vehicle'
import { queryVehicleByVinShowApi, recognizeVinFromImage } from '@/api/vehicle-info'
import { useVehicleStore } from '@/store/vehicle'

definePage({
  style: {
    navigationBarTitleText: '创建车辆',
  },
})

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/

const vehicleStore = useVehicleStore()
const submitting = ref(false)
const vinLoading = ref(false)
const vinOcrLoading = ref(false)
const vinError = ref('')
const dirty = ref(false)
const allowLeave = ref(false)
const vinResult = ref<VehicleBasicInfo | null>(null)
const showMoreFields = ref(false)

const form = reactive({
  vin: '',
  brandName: '',
  seriesName: '',
  modelYear: '',
  modelName: '',
  model: '',
  energyType: '',
  displacement: '',
  colorName: '',
  carType: '',
  bodyType: '',
  fuelGrade: '',
  transmission: '',
  vehicleLevel: '',
  emissionStandard: '',
  guidePrice: '',
  remark: '',
})

const canSubmit = computed(() => !!form.brandName.trim() && !!form.seriesName.trim())
const busy = computed(() => submitting.value || vinLoading.value || vinOcrLoading.value)

watch(form, () => {
  dirty.value = true
}, { deep: true })

function normalizeVin(value: string) {
  return value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17)
}

function normalizeGuidePrice(value: string) {
  const text = value.trim()
  if (!text || text === '-' || text.includes('暂无')) {
    return null
  }
  const match = text.replace(/,/g, '').match(/\d+(?:\.\d+)?/)
  if (!match) {
    return null
  }
  const numberValue = Number(match[0])
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null
}

function onVinInput(event: any) {
  form.vin = normalizeVin(String(event.detail.value || ''))
  vinResult.value = null
}

function fillVehicleForm(vin: string, result: VehicleBasicInfo) {
  vinResult.value = result
  form.vin = vin
  form.brandName = result.brandName
  form.seriesName = result.seriesName
  form.modelYear = result.year
  form.modelName = result.modelName || result.fullModelName
  form.model = result.fullModelName
  form.carType = result.carType
  form.bodyType = result.bodyType
  form.energyType = result.fuelType
  form.fuelGrade = result.fuelGrade
  form.displacement = result.displacement
  form.transmission = result.gearbox || result.gearboxType
  form.vehicleLevel = result.vehicleLevel
  form.emissionStandard = result.emissionStandard
  form.guidePrice = result.guidePrice
}

async function queryVin(vinValue = form.vin) {
  const vin = normalizeVin(vinValue)
  vinError.value = ''
  vinResult.value = null
  if (!VIN_PATTERN.test(vin)) {
    vinError.value = '请输入 17 位标准 VIN 码（不包含 I、O、Q）'
    return
  }

  vinLoading.value = true
  try {
    const result = await queryVehicleByVinShowApi(vin)
    fillVehicleForm(vin, result)
    uni.showToast({ title: '识别成功', icon: 'success' })
  }
  catch (error) {
    vinError.value = error instanceof Error ? error.message : 'VIN 查询失败，请稍后重试'
  }
  finally {
    vinLoading.value = false
  }
}

function chooseVinImage() {
  if (busy.value) {
    return
  }
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    success: async (res) => {
      const file = res.tempFiles?.[0]
      if (!file) {
        return
      }
      if (file.size > 7 * 1024 * 1024) {
        vinError.value = 'VIN 图片大小不能超过 7MB'
        return
      }
      vinError.value = ''
      vinOcrLoading.value = true
      try {
        const vin = await recognizeVinFromImage(file.tempFilePath)
        form.vin = normalizeVin(vin)
        await queryVin(form.vin)
      }
      catch (error) {
        vinError.value = error instanceof Error ? error.message : 'VIN 图片识别失败'
      }
      finally {
        vinOcrLoading.value = false
      }
    },
  })
}

async function submit() {
  if (submitting.value) {
    return
  }
  if (!canSubmit.value) {
    vinError.value = '请至少填写品牌和车系'
    return
  }

  submitting.value = true
  try {
    const vehicle = await createVehicle({
      vin: form.vin.trim() || undefined,
      brandName: form.brandName.trim(),
      seriesName: form.seriesName.trim(),
      modelName: form.modelName.trim(),
      model: form.model.trim(),
      modelYear: form.modelYear.trim(),
      carType: form.carType.trim(),
      bodyType: form.bodyType.trim(),
      energyType: form.energyType.trim(),
      fuelGrade: form.fuelGrade.trim(),
      displacement: form.displacement.trim(),
      transmission: form.transmission.trim(),
      vehicleLevel: form.vehicleLevel.trim(),
      emissionStandard: form.emissionStandard.trim(),
      guidePrice: normalizeGuidePrice(form.guidePrice),
      colorName: form.colorName.trim(),
      remark: form.remark.trim(),
      identifyType: vinResult.value ? 'vin_text' : 'manual',
    })
    vehicleStore.setCurrentVehicle(vehicle)
    dirty.value = false
    allowLeave.value = true
    uni.redirectTo({ url: `/pages/capture/index?vehicleId=${vehicle.id}` })
  }
  catch (error) {
    vinError.value = error instanceof Error ? error.message : '创建失败，请稍后重试'
  }
  finally {
    submitting.value = false
  }
}

onBackPress(() => {
  if (!dirty.value || allowLeave.value) {
    return false
  }
  uni.showModal({
    title: '放弃创建？',
    content: '当前填写的内容尚未保存，返回后将会丢失。',
    confirmText: '放弃',
    confirmColor: '#EF4444',
    success: (result) => {
      if (result.confirm) {
        allowLeave.value = true
        uni.navigateBack()
      }
    },
  })
  return true
})
</script>

<template>
  <view class="min-h-screen bg-[#F5F7FA] px-3 pb-28 pt-3">
    <view class="rounded-3 bg-white p-4">
      <view class="mb-3 flex items-start gap-3">
        <view class="h-7 w-7 flex shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-3.5 text-[#B45309] font-700">
          1
        </view>
        <view>
          <view class="text-4 text-[#111827] font-700">
            VIN 智能识别
          </view>
          <view class="mt-1 text-3 text-[#64748B]">
            输入 17 位 VIN，自动带出车辆信息
          </view>
        </view>
      </view>

      <view class="text-3.5 text-[#475569] font-600">
        VIN 码
      </view>
      <view class="mt-2 flex items-center gap-2">
        <input
          :value="form.vin"
          class="h-11 min-w-0 flex-1 rounded-2 border border-[#CBD5E1] bg-white px-3 text-4 text-[#111827] uppercase"
          :maxlength="17"
          placeholder="请输入 17 位 VIN"
          placeholder-class="text-[#94A3B8]"
          @input="onVinInput"
        >
        <button
          class="m-0 h-11 rounded-2 bg-[#FBBF24] px-4 text-3.5 text-[#111827]"
          :disabled="busy"
          :loading="vinLoading"
          @click="queryVin()"
        >
          查询
        </button>
      </view>
      <view class="mt-2 text-3" :class="VIN_PATTERN.test(form.vin) ? 'text-[#16A34A]' : 'text-[#94A3B8]'">
        {{ form.vin.length }}/17
      </view>
      <button
        class="mt-3 h-10 rounded-2 border border-[#CBD5E1] bg-white px-4 text-3.5 text-[#334155]"
        :disabled="busy"
        :loading="vinOcrLoading"
        @click="chooseVinImage"
      >
        {{ vinOcrLoading ? '识别并查询中' : '上传图片识别 VIN' }}
      </button>
      <view v-if="vinError" class="mt-3 rounded-2 bg-[#FEF2F2] px-3 py-2 text-3 text-[#B91C1C]">
        {{ vinError }}
      </view>
      <view v-if="vinResult" class="mt-3 rounded-2 bg-[#ECFDF5] px-3 py-2 text-3 text-[#047857]">
        识别成功：{{ vinResult.brandName }} {{ vinResult.seriesName }} {{ vinResult.fullModelName }}
      </view>
    </view>

    <view class="mt-3 rounded-3 bg-white p-4">
      <view class="mb-3 flex items-start gap-3">
        <view class="h-7 w-7 flex shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-3.5 text-[#B45309] font-700">
          2
        </view>
        <view>
          <view class="text-4 text-[#111827] font-700">
            车辆基础信息
          </view>
          <view class="mt-1 text-3 text-[#64748B]">
            车辆信息由第三方数据服务提供，仅供参考；不准确时请手动修改。
          </view>
        </view>
      </view>

      <view class="grid grid-cols-1 gap-3">
        <view>
          <view class="mb-1 text-3.5 text-[#475569]">品牌 *</view>
          <input v-model="form.brandName" class="h-11 rounded-2 border border-[#CBD5E1] px-3 text-3.5" placeholder="如：宝马" />
        </view>
        <view>
          <view class="mb-1 text-3.5 text-[#475569]">车系 *</view>
          <input v-model="form.seriesName" class="h-11 rounded-2 border border-[#CBD5E1] px-3 text-3.5" placeholder="如：宝马5系" />
        </view>
        <view>
          <view class="mb-1 text-3.5 text-[#475569]">年款</view>
          <input v-model="form.modelYear" class="h-11 rounded-2 border border-[#CBD5E1] px-3 text-3.5" placeholder="如：2021款" />
        </view>
        <view>
          <view class="mb-1 text-3.5 text-[#475569]">车型名称</view>
          <input v-model="form.modelName" class="h-11 rounded-2 border border-[#CBD5E1] px-3 text-3.5" placeholder="如：530Li 领先型" />
        </view>
        <view>
          <view class="mb-1 text-3.5 text-[#475569]">燃料类型</view>
          <input v-model="form.energyType" class="h-11 rounded-2 border border-[#CBD5E1] px-3 text-3.5" placeholder="汽油 / 纯电 / 混动" />
        </view>
        <view>
          <view class="mb-1 text-3.5 text-[#475569]">排量</view>
          <input v-model="form.displacement" class="h-11 rounded-2 border border-[#CBD5E1] px-3 text-3.5" placeholder="如：2.0T" />
        </view>
        <view>
          <view class="mb-1 text-3.5 text-[#475569]">车身颜色</view>
          <input v-model="form.colorName" class="h-11 rounded-2 border border-[#CBD5E1] px-3 text-3.5" placeholder="如：黑色" />
        </view>
      </view>

      <view class="mt-4 text-3.5 text-[#B45309]" @click="showMoreFields = !showMoreFields">
        {{ showMoreFields ? '收起更多参数' : '展开更多参数（选填）' }}
      </view>
      <view v-if="showMoreFields" class="mt-3 grid grid-cols-1 gap-3">
        <input v-model="form.model" class="h-11 rounded-2 border border-[#CBD5E1] px-3 text-3.5" placeholder="完整车型" />
        <input v-model="form.carType" class="h-11 rounded-2 border border-[#CBD5E1] px-3 text-3.5" placeholder="车辆类型" />
        <input v-model="form.bodyType" class="h-11 rounded-2 border border-[#CBD5E1] px-3 text-3.5" placeholder="车身结构" />
        <input v-model="form.fuelGrade" class="h-11 rounded-2 border border-[#CBD5E1] px-3 text-3.5" placeholder="燃油标号" />
        <input v-model="form.transmission" class="h-11 rounded-2 border border-[#CBD5E1] px-3 text-3.5" placeholder="变速箱" />
        <input v-model="form.vehicleLevel" class="h-11 rounded-2 border border-[#CBD5E1] px-3 text-3.5" placeholder="车辆级别" />
        <input v-model="form.emissionStandard" class="h-11 rounded-2 border border-[#CBD5E1] px-3 text-3.5" placeholder="排放标准" />
        <input v-model="form.guidePrice" class="h-11 rounded-2 border border-[#CBD5E1] px-3 text-3.5" placeholder="新车指导价（万元）" />
      </view>

      <view class="mt-3">
        <view class="mb-1 text-3.5 text-[#475569]">车辆备注</view>
        <textarea
          v-model="form.remark"
          class="h-20 w-full rounded-2 border border-[#CBD5E1] p-3 text-3.5"
          placeholder="门店、车况亮点或配置补充"
        />
      </view>
    </view>

    <view class="safe-area-inset-bottom fixed bottom-0 left-0 right-0 border-t border-[#E5E7EB] bg-white p-3">
      <button
        class="h-12 rounded-2 text-4 text-white"
        :class="canSubmit ? 'bg-[#3B82F6]' : 'bg-[#93C5FD]'"
        :disabled="submitting || !canSubmit"
        :loading="submitting"
        @click="submit"
      >
        {{ submitting ? '正在创建' : '创建并开始拍摄' }}
      </button>
    </view>
  </view>
</template>
