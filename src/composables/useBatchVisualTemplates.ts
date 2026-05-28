import { ref, watch } from 'vue'

import type { BatchVisualTemplate, BatchVisualTemplateInput } from '@/types/workspace'

const STORAGE_KEY = 'workspace-batch-visual-templates'

const NEW_PRESET_VALUE = '__new__'

function createId() {
  return `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const defaultTemplates: BatchVisualTemplate[] = [
  {
    id: 'tpl-may-showroom',
    name: '5月展厅批量上新',
    enableSceneChange: true,
    sceneIndex: 0,
    sceneCategory: '展厅灯光',
    outputRatio: '1:1',
    useRecentLogo: false,
    lightConsistency: true,
    paintRefresh: false,
    interiorEnhance: false,
    updatedAt: '2026-05-20 09:00',
  },
]

function readTemplates(): BatchVisualTemplate[] {
  if (typeof window === 'undefined') return [...defaultTemplates]

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...defaultTemplates]

    const parsed = JSON.parse(raw) as BatchVisualTemplate[]
    return parsed.length ? parsed : [...defaultTemplates]
  } catch {
    return [...defaultTemplates]
  }
}

function writeTemplates(templates: BatchVisualTemplate[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

const templates = ref<BatchVisualTemplate[]>(readTemplates())

watch(
  templates,
  (value) => {
    writeTemplates(value)
  },
  { deep: true },
)

export function useBatchVisualTemplates() {
  function getTemplateById(id: string) {
    return templates.value.find((item) => item.id === id)
  }

  function saveTemplate(input: BatchVisualTemplateInput) {
    const template: BatchVisualTemplate = {
      ...input,
      id: createId(),
      updatedAt: formatNow(),
    }
    templates.value = [...templates.value, template]
    return template
  }

  function updateTemplate(id: string, input: BatchVisualTemplateInput) {
    const index = templates.value.findIndex((item) => item.id === id)
    if (index < 0) return null

    const next: BatchVisualTemplate = {
      ...input,
      id,
      updatedAt: formatNow(),
    }
    templates.value = templates.value.map((item, itemIndex) =>
      itemIndex === index ? next : item,
    )
    return next
  }

  function removeTemplate(id: string) {
    templates.value = templates.value.filter((item) => item.id !== id)
  }

  return {
    NEW_PRESET_VALUE,
    templates,
    getTemplateById,
    saveTemplate,
    updateTemplate,
    removeTemplate,
  }
}

function formatNow() {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
