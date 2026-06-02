import { computed, ref } from 'vue'

import {
  getBatchPresets,
  saveBatchPreset,
  type BatchVisualConfig,
} from '@/api/visual-workbench'
import { getBatchSceneImageUrl, getBatchSceneOptionId } from '@/constants/workspace'
import type { BatchVisualTemplate, BatchVisualTemplateInput } from '@/types/workspace'

const NEW_PRESET_VALUE = '__new__'

const templates = ref<BatchVisualTemplate[]>([])
const isLoading = ref(false)
const isReady = ref(false)

function normalizeConfig(input: BatchVisualTemplateInput): BatchVisualConfig {
  return {
    enableSceneChange: input.enableSceneChange,
    sceneOptionId: input.enableSceneChange
      ? getBatchSceneOptionId(input.sceneCategory, input.sceneIndex)
      : undefined,
    sceneReferenceImageUrl: input.enableSceneChange
      ? getBatchSceneImageUrl(input.sceneCategory, input.sceneIndex)
      : undefined,
    sceneIndex: input.sceneIndex,
    sceneCategory: input.sceneCategory,
    outputRatio: input.outputRatio,
    useRecentLogo: input.useRecentLogo,
    enableLightConsistency: input.lightConsistency,
    enablePaintRefresh: input.paintRefresh,
    colorCode: input.paintRefresh ? input.colorCode?.trim() || null : null,
    enableInteriorClean: input.interiorEnhance,
    enableInteriorCollage: input.interiorEnhance && input.interiorCollage,
  }
}

function mapInteriorCollage(
  interiorEnhance: boolean,
  interiorCollage?: boolean | null,
) {
  return interiorEnhance && Boolean(interiorCollage)
}

async function ensureLoaded() {
  if (isReady.value || isLoading.value) return
  isLoading.value = true

  try {
    const result = await getBatchPresets()
    templates.value = result.items.map((item) => ({
      id: item.presetId,
      name: item.name,
      enableSceneChange: item.visualConfig.enableSceneChange,
      sceneIndex: item.visualConfig.sceneIndex,
      sceneCategory: item.visualConfig.sceneCategory,
      outputRatio: item.visualConfig.outputRatio,
      useRecentLogo: item.visualConfig.useRecentLogo,
      lightConsistency: item.visualConfig.enableLightConsistency,
      paintRefresh: item.visualConfig.enablePaintRefresh,
      colorCode: item.visualConfig.colorCode ?? null,
      interiorEnhance: item.visualConfig.enableInteriorClean,
      interiorCollage: mapInteriorCollage(
        item.visualConfig.enableInteriorClean,
        item.visualConfig.enableInteriorCollage ??
          item.visualConfig.interiorCollage,
      ),
      updatedAt: item.updatedAt,
    }))
    isReady.value = true
  } finally {
    isLoading.value = false
  }
}

export function useBatchVisualTemplates() {
  const presetOptions = computed(() => templates.value)

  function getTemplateById(id: string) {
    return templates.value.find((item) => item.id === id)
  }

  async function reloadTemplates() {
    isReady.value = false
    await ensureLoaded()
  }

  async function saveTemplate(input: BatchVisualTemplateInput) {
    const created = await saveBatchPreset({
      name: input.name,
      visualConfig: normalizeConfig(input),
    })

    const nextTemplate: BatchVisualTemplate = {
      id: created.presetId,
      name: created.name,
      enableSceneChange: created.visualConfig.enableSceneChange,
      sceneIndex: created.visualConfig.sceneIndex,
      sceneCategory: created.visualConfig.sceneCategory,
      outputRatio: created.visualConfig.outputRatio,
      useRecentLogo: created.visualConfig.useRecentLogo,
      lightConsistency: created.visualConfig.enableLightConsistency,
      paintRefresh: created.visualConfig.enablePaintRefresh,
      colorCode: created.visualConfig.colorCode ?? null,
      interiorEnhance: created.visualConfig.enableInteriorClean,
      interiorCollage: mapInteriorCollage(
        created.visualConfig.enableInteriorClean,
        created.visualConfig.enableInteriorCollage ??
          created.visualConfig.interiorCollage,
      ),
      updatedAt: created.updatedAt,
    }

    templates.value = [...templates.value.filter((item) => item.id !== nextTemplate.id), nextTemplate]
    return nextTemplate
  }

  async function updateTemplate(id: string, input: BatchVisualTemplateInput) {
    const updated = await saveBatchPreset({
      presetId: id,
      name: input.name,
      visualConfig: normalizeConfig(input),
    })

    const nextTemplate: BatchVisualTemplate = {
      id: updated.presetId,
      name: updated.name,
      enableSceneChange: updated.visualConfig.enableSceneChange,
      sceneIndex: updated.visualConfig.sceneIndex,
      sceneCategory: updated.visualConfig.sceneCategory,
      outputRatio: updated.visualConfig.outputRatio,
      useRecentLogo: updated.visualConfig.useRecentLogo,
      lightConsistency: updated.visualConfig.enableLightConsistency,
      paintRefresh: updated.visualConfig.enablePaintRefresh,
      colorCode: updated.visualConfig.colorCode ?? null,
      interiorEnhance: updated.visualConfig.enableInteriorClean,
      interiorCollage: mapInteriorCollage(
        updated.visualConfig.enableInteriorClean,
        updated.visualConfig.enableInteriorCollage ??
          updated.visualConfig.interiorCollage,
      ),
      updatedAt: updated.updatedAt,
    }

    templates.value = templates.value.map((item) =>
      item.id === id ? nextTemplate : item,
    )
    return nextTemplate
  }

  function removeTemplate(id: string) {
    templates.value = templates.value.filter((item) => item.id !== id)
  }

  void ensureLoaded()

  return {
    NEW_PRESET_VALUE,
    templates: presetOptions,
    isLoading,
    ensureLoaded: reloadTemplates,
    getTemplateById,
    saveTemplate,
    updateTemplate,
    removeTemplate,
  }
}
