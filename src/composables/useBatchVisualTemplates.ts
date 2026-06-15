import { computed, ref } from 'vue'

import {
  deleteBatchPreset,
  getBatchPresets,
  saveBatchPreset,
  type BatchVisualConfig,
  type LogoPlacement,
} from '@/api/visual-workbench'
import { getBatchSceneImageUrl, getBatchSceneOptionId } from '@/constants/workspace'
import type { BatchVisualTemplate, BatchVisualTemplateInput } from '@/types/workspace'
import { resolveSceneReferenceImageUrl } from '@/utils/scene-reference-url'

const NEW_PRESET_VALUE = '__new__'

const allLogoPlacements: LogoPlacement[] = ['plate', 'wall']

function normalizeLogoPlacements(
  placements: LogoPlacement[] | null | undefined,
  enabled: boolean,
) {
  if (!enabled) return [] as LogoPlacement[]

  const next = allLogoPlacements.filter((placement, index, source) =>
    placements?.includes(placement) && source.indexOf(placement) === index,
  )

  return (next.length ? next : ['plate']) as LogoPlacement[]
}

function normalizeConfig(input: BatchVisualTemplateInput): BatchVisualConfig {
  return {
    enableSceneChange: input.enableSceneChange,
    sceneOptionId: input.enableSceneChange
      ? getBatchSceneOptionId(input.sceneCategory, input.sceneIndex)
      : undefined,
    sceneReferenceImageUrl: input.enableSceneChange
      ? resolveSceneReferenceImageUrl(
          getBatchSceneImageUrl(input.sceneCategory, input.sceneIndex),
        )
      : undefined,
    sceneIndex: input.sceneIndex,
    sceneCategory: input.sceneCategory,
    outputRatio: input.outputRatio,
    useRecentLogo: input.useRecentLogo,
    logoPlacements: normalizeLogoPlacements(
      input.logoPlacements,
      input.useRecentLogo,
    ),
    enableLightConsistency: input.lightConsistency,
    enablePaintRefresh: input.paintRefresh,
    colorCode: input.paintRefresh ? input.colorCode?.trim() || null : null,
    enableInteriorClean: input.interiorCollage && input.interiorEnhance,
    enableInteriorCollage: input.interiorCollage,
  }
}

function mapInteriorFlags(config: BatchVisualConfig) {
  const collage = Boolean(
    config.enableInteriorCollage ?? config.interiorCollage,
  )

  return {
    interiorCollage: collage,
    interiorEnhance: collage && Boolean(config.enableInteriorClean),
  }
}

export function useBatchVisualTemplates() {
  const templates = ref<BatchVisualTemplate[]>([])
  const isLoading = ref(false)
  const isReady = ref(false)
  const presetOptions = computed(() => templates.value)

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
        logoPlacements: normalizeLogoPlacements(
          item.visualConfig.logoPlacements,
          item.visualConfig.useRecentLogo,
        ),
        lightConsistency: item.visualConfig.enableLightConsistency,
        paintRefresh: item.visualConfig.enablePaintRefresh,
        colorCode: item.visualConfig.colorCode ?? null,
        ...mapInteriorFlags(item.visualConfig),
        updatedAt: item.updatedAt,
      }))
      isReady.value = true
    } finally {
      isLoading.value = false
    }
  }

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
      logoPlacements: normalizeLogoPlacements(
        created.visualConfig.logoPlacements,
        created.visualConfig.useRecentLogo,
      ),
      lightConsistency: created.visualConfig.enableLightConsistency,
      paintRefresh: created.visualConfig.enablePaintRefresh,
      colorCode: created.visualConfig.colorCode ?? null,
      ...mapInteriorFlags(created.visualConfig),
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
      logoPlacements: normalizeLogoPlacements(
        updated.visualConfig.logoPlacements,
        updated.visualConfig.useRecentLogo,
      ),
      lightConsistency: updated.visualConfig.enableLightConsistency,
      paintRefresh: updated.visualConfig.enablePaintRefresh,
      colorCode: updated.visualConfig.colorCode ?? null,
      ...mapInteriorFlags(updated.visualConfig),
      updatedAt: updated.updatedAt,
    }

    templates.value = templates.value.map((item) =>
      item.id === id ? nextTemplate : item,
    )
    return nextTemplate
  }

  async function deleteTemplate(id: string) {
    const result = await deleteBatchPreset(id)
    if (!result.deleted) {
      throw new Error('预设不存在或已被删除')
    }

    templates.value = templates.value.filter((item) => item.id !== id)
    return templates.value
  }

  function removeTemplate(id: string) {
    templates.value = templates.value.filter((item) => item.id !== id)
  }

  void ensureLoaded()

  return {
    NEW_PRESET_VALUE,
    templates: presetOptions,
    isLoading,
    ensureLoaded,
    reloadTemplates,
    getTemplateById,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    removeTemplate,
  }
}
