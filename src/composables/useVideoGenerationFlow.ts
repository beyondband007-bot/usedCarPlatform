import { computed, onUnmounted, ref, watch } from 'vue'

import { uploadAsset } from '@/api/visual-workbench'
import {
  cancelVideoGenerationTask,
  createVideoAudioPreview,
  createVideoScriptDraft,
  createVideoGenerationTask,
  getDigitalHumanVoice,
  getVideoVoiceOptions,
  getVideoDigitalHumans,
  getVideoGenerationTask,
  getVideoGenerationTasks,
  getVideoScriptDraft,
  getVideoTemplates,
  getVideoWorkflowContract,
  optimizeVideoNarration,
  regenerateVideoGenerationTask,
  translateVideoNarration,
  validateTemplateInputs,
} from '@/api/video-generation'
import {
  getVideoGenerationDraftStorageKey,
  getVideoGenerationTaskStorageKey,
  MAX_DEALERSHIP_IMAGES,
  MAX_VIDEO_EXTERIOR_IMAGES,
  MAX_VIDEO_INTERIOR_IMAGES,
  MAX_VIDEO_REFERENCE_IMAGES,
  VIDEO_DURATION_SECONDS,
  VIDEO_TASK_POLL_MS,
} from '@/constants/short-video'
import { GENERATION_TASK_POLL_MAX_MS } from '@/constants/workspace-polling'
import type {
  CreateVideoScriptDraftPayload,
  DealershipFormData,
  DigitalHuman,
  PromotionFormData,
  SingleCarFormData,
  UploadedAsset,
  ValidateTemplateInputsIssue,
  VideoGenerationTask,
  VideoGenerationStep,
  VideoHistoryItem,
  VideoAudioPreview,
  OptimizeNarrationResult,
  VideoScriptDraft,
  VideoTemplate,
  VideoVoiceOption,
  VideoUploadPreviewItem,
} from '@/types/video-generation'
import { resolveVideoGenerationErrorMessage } from '@/utils/video-generation-errors'
import { getFallbackVideoTemplates } from '@/constants/video-generation-fallback-templates'
import {
  getLocalDigitalHumans,
  getLocalVideoSceneTemplates,
  isLocalOnlyDigitalHumanId,
} from '@/constants/video-generation-local-assets'
import { useCreditsStore } from '@/stores/credits'

const TERMINAL_STATUSES = new Set(['success', 'fail', 'canceled'])
const CANCELABLE_STATUSES = new Set(['waiting', 'queued', 'generating'])
const REGENERATABLE_STATUSES = new Set(['success', 'fail', 'canceled'])

function createEmptySingleCarForm(): SingleCarFormData {
  return {
    brand: '',
    modelYear: '',
    displacement: '',
    salesName: '',
    series: '',
    digitalHumanId: '',
    language: 'Chinese',
    sellingPointHints: '',
    vehicleImageSummary: '',
  }
}

function createEmptyPromotionForm(): PromotionFormData {
  return {
    ...createEmptySingleCarForm(),
    promotionText: '',
  }
}

function createEmptyDealershipForm(): DealershipFormData {
  return {
    dealershipName: '',
    digitalHumanId: '',
    language: 'Chinese',
    featuredVehicleNames: '',
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export function useVideoGenerationFlow(ownerKey: string) {
  const creditsStore = useCreditsStore()
  const currentStep = ref<VideoGenerationStep>('template')
  const templateList = ref<VideoTemplate[]>([])
  const selectedTemplate = ref<VideoTemplate | null>(null)
  const digitalHumanList = ref<DigitalHuman[]>([])
  const supportedLanguageOptions = ref<Array<{ value: string; label: string; status: string }>>([])
  const singleCarForm = ref<SingleCarFormData>(createEmptySingleCarForm())
  const promotionForm = ref<PromotionFormData>(createEmptyPromotionForm())
  const dealershipForm = ref<DealershipFormData>(createEmptyDealershipForm())
  const exteriorUploads = ref<VideoUploadPreviewItem[]>([])
  const interiorUploads = ref<VideoUploadPreviewItem[]>([])
  const referenceUploads = ref<VideoUploadPreviewItem[]>([])
  const dealershipUploads = ref<VideoUploadPreviewItem[]>([])
  const scriptDraft = ref<VideoScriptDraft | null>(null)
  const confirmedScriptText = ref('')
  const translatedNarrationText = ref('')
  const voiceOptions = ref<VideoVoiceOption[]>([])
  const selectedVoiceId = ref('')
  const audioPreviews = ref<VideoAudioPreview[]>([])
  const confirmedAudioPreviewId = ref('')
  const draftInputFingerprint = ref('')
  const draftNeedsRegeneration = ref(false)
  const currentTask = ref<VideoGenerationTask | null>(null)
  const historyList = ref<VideoHistoryItem[]>([])
  const validationIssues = ref<ValidateTemplateInputsIssue[]>([])
  const errorMessage = ref('')
  const loadingMap = ref<Record<string, boolean>>({})
  let pollingTimer: ReturnType<typeof setTimeout> | null = null

  const draftStorageKey = getVideoGenerationDraftStorageKey(ownerKey)
  const taskStorageKey = getVideoGenerationTaskStorageKey(ownerKey)

  const selectedDigitalHuman = computed(() =>
    digitalHumanList.value.find((item) => item.id === activeDigitalHumanId.value) ?? null,
  )

  const confirmedAudioPreview = computed(() =>
    audioPreviews.value.find((item) => item.audioPreviewId === confirmedAudioPreviewId.value) ?? null,
  )

  const canSubmitVideoTask = computed(
    () => Boolean(scriptDraft.value?.scriptDraftId && confirmedAudioPreview.value?.canUseForVideo),
  )

  const currentInputFingerprint = computed(() => JSON.stringify(buildValidatePayload()))
  const hasReusableDraft = computed(
    () =>
      Boolean(scriptDraft.value?.scriptDraftId) &&
      Boolean(draftInputFingerprint.value) &&
      currentInputFingerprint.value === draftInputFingerprint.value,
  )

  const activeDigitalHumanId = computed(() => {
    if (selectedTemplate.value?.type === 'dealership') {
      return dealershipForm.value.digitalHumanId
    }
    if (selectedTemplate.value?.type === 'promotion') {
      return promotionForm.value.digitalHumanId
    }
    return singleCarForm.value.digitalHumanId
  })

  const isComingSoonTemplate = computed(
    () =>
      selectedTemplate.value?.status === 'coming_soon' ||
      selectedTemplate.value?.generationReadiness === 'unavailable' ||
      selectedTemplate.value?.type === 'market' ||
      selectedTemplate.value?.type === 'vehicle-ad',
  )

  function setLoading(key: string, value: boolean) {
    loadingMap.value = { ...loadingMap.value, [key]: value }
  }

  function isLoading(key: string) {
    return Boolean(loadingMap.value[key])
  }

  function persistDraftId(scriptDraftId: string) {
    try {
      localStorage.setItem(draftStorageKey, scriptDraftId)
    } catch {
      // ignore
    }
  }

  function persistTaskId(taskId: string) {
    try {
      localStorage.setItem(taskStorageKey, taskId)
    } catch {
      // ignore
    }
  }

  function clearPersistedDraftId() {
    try {
      localStorage.removeItem(draftStorageKey)
    } catch {
      // ignore
    }
  }

  function clearPersistedTaskId() {
    try {
      localStorage.removeItem(taskStorageKey)
    } catch {
      // ignore
    }
  }

  function resetAudioConfirmation() {
    audioPreviews.value = []
    confirmedAudioPreviewId.value = ''
  }

  function clearUploads() {
    exteriorUploads.value.forEach(revokeUploadItem)
    interiorUploads.value.forEach(revokeUploadItem)
    referenceUploads.value.forEach(revokeUploadItem)
    dealershipUploads.value.forEach(revokeUploadItem)
    exteriorUploads.value = []
    interiorUploads.value = []
    referenceUploads.value = []
    dealershipUploads.value = []
  }

  function resetFlowToInitial() {
    stopPolling()
    selectedTemplate.value = null
    singleCarForm.value = createEmptySingleCarForm()
    promotionForm.value = createEmptyPromotionForm()
    dealershipForm.value = createEmptyDealershipForm()
    clearUploads()
    scriptDraft.value = null
    confirmedScriptText.value = ''
    voiceOptions.value = []
    selectedVoiceId.value = ''
    draftInputFingerprint.value = ''
    draftNeedsRegeneration.value = false
    resetAudioConfirmation()
    currentTask.value = null
    validationIssues.value = []
    errorMessage.value = ''
    clearPersistedDraftId()
    clearPersistedTaskId()
    currentStep.value = 'template'
  }

  function invalidateDraftForInputChange() {
    scriptDraft.value = null
    confirmedScriptText.value = ''
    translatedNarrationText.value = ''
    voiceOptions.value = []
    selectedVoiceId.value = ''
    draftInputFingerprint.value = ''
    draftNeedsRegeneration.value = true
    resetAudioConfirmation()
    clearPersistedDraftId()
  }

  watch(currentInputFingerprint, (nextFingerprint) => {
    if (
      currentStep.value === 'form' &&
      scriptDraft.value &&
      draftInputFingerprint.value &&
      nextFingerprint !== draftInputFingerprint.value
    ) {
      invalidateDraftForInputChange()
    }
  })

  function setDefaultVoice() {
    selectedVoiceId.value =
      voiceOptions.value.find((item) => item.recommended)?.id ??
      voiceOptions.value[0]?.id ??
      ''
  }

  async function loadVoiceOptions(digitalHumanId = activeDigitalHumanId.value) {
    if (!digitalHumanId || isLocalOnlyDigitalHumanId(digitalHumanId)) {
      voiceOptions.value = []
      selectedVoiceId.value = ''
      return []
    }
    setLoading('voices', true)
    try {
      const result = await getVideoVoiceOptions(digitalHumanId)
      voiceOptions.value = result.items ?? []
      if (!voiceOptions.value.some((item) => item.id === selectedVoiceId.value)) {
        setDefaultVoice()
      }
      return voiceOptions.value
    } finally {
      setLoading('voices', false)
    }
  }

  function setConfirmedScriptText(value: string) {
    confirmedScriptText.value = value
    translatedNarrationText.value = ''
    resetAudioConfirmation()
  }

  function selectVoice(voiceId: string) {
    if (selectedVoiceId.value === voiceId) return
    selectedVoiceId.value = voiceId
    resetAudioConfirmation()
  }

  function confirmAudioPreview(audioPreviewId: string) {
    const preview = audioPreviews.value.find((item) => item.audioPreviewId === audioPreviewId)
    if (!preview?.canUseForVideo) {
      errorMessage.value = '试听音频时长需在 8-15 秒内，才能生成视频'
      return false
    }
    confirmedAudioPreviewId.value = audioPreviewId
    currentStep.value = 'review'
    return true
  }

  function cancelAudioPreviewConfirmation() {
    if (!confirmedAudioPreviewId.value) return false
    confirmedAudioPreviewId.value = ''
    currentStep.value = 'review'
    return true
  }

  function readPersistedDraftId() {
    try {
      return localStorage.getItem(draftStorageKey) ?? ''
    } catch {
      return ''
    }
  }

  function readPersistedTaskId() {
    try {
      return localStorage.getItem(taskStorageKey) ?? ''
    } catch {
      return ''
    }
  }

  function stopPolling() {
    if (pollingTimer) {
      clearTimeout(pollingTimer)
      pollingTimer = null
    }
  }

  function sleep(ms: number) {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms)
    })
  }

  async function waitForTaskCompletion(taskId: string) {
    stopPolling()
    persistTaskId(taskId)
    const deadline = Date.now() + GENERATION_TASK_POLL_MAX_MS

    let task = await getVideoGenerationTask(taskId)
    currentTask.value = task
    currentStep.value = task.status === 'success' ? 'result' : 'task'

    while (!TERMINAL_STATUSES.has(task.status) && Date.now() < deadline) {
      await sleep(task.pollingRecommendedMs ?? VIDEO_TASK_POLL_MS)
      task = await getVideoGenerationTask(taskId)
      currentTask.value = task
    }

    if (task.status === 'success') {
      currentStep.value = 'result'
      clearPersistedDraftId()
    } else if (TERMINAL_STATUSES.has(task.status)) {
      stopPolling()
    }

    return task
  }

  async function trackTask(taskId: string) {
    persistTaskId(taskId)
    const task = await getVideoGenerationTask(taskId)
    currentTask.value = task
    currentStep.value = task.status === 'success' ? 'result' : 'task'
    if (!TERMINAL_STATUSES.has(task.status)) {
      startPolling(taskId)
    }
    return task
  }

  function mergeComingSoonTemplates(items: VideoTemplate[], capabilities: VideoTemplate['type'][] | undefined, contractCapabilities: Array<{ type: VideoTemplate['type']; label: string; status: string; reason?: string }>) {
    const existingTypes = new Set(items.map((item) => item.type))
    const merged = [...items]
    for (const capability of contractCapabilities) {
      if (capability.status !== 'coming_soon') continue
      if (existingTypes.has(capability.type)) {
        merged.forEach((item) => {
          if (item.type === capability.type) {
            item.status = 'coming_soon'
            item.generationReadiness = 'unavailable'
            item.reason = capability.reason
          }
        })
        continue
      }
      merged.push({
        id: `coming-soon-${capability.type}`,
        templateId: `coming-soon-${capability.type}`,
        title: capability.label,
        type: capability.type,
        typeLabel: capability.label,
        style: 'professional',
        styleLabel: '专业',
        badge: null,
        thumbnailUrl: '',
        stylePrompt: capability.reason ?? '即将开放',
        durationSeconds: VIDEO_DURATION_SECONDS,
        outputRatio: '9:16',
        videoResolution: '720p',
        inputRequirements: [],
        requiredFields: [],
        optionalFields: [],
        status: 'coming_soon',
        generationReadiness: 'unavailable',
        reason: capability.reason,
      })
    }
    if (capabilities?.length) {
      return merged.filter((item) => capabilities.includes(item.type))
    }
    return merged
  }

  async function initializeFlow() {
    setLoading('bootstrap', true)
    errorMessage.value = ''
    try {
      const [contract, templates, humans] = await Promise.all([
        getVideoWorkflowContract(),
        getVideoTemplates(),
        getVideoDigitalHumans(),
      ])
      const apiTemplates = mergeComingSoonTemplates(
        templates.items ?? [],
        undefined,
        contract.templateCapabilities ?? [],
      )
      templateList.value = getLocalVideoSceneTemplates(apiTemplates)
      digitalHumanList.value = getLocalDigitalHumans(humans)
      supportedLanguageOptions.value = contract.supportedLanguages ?? []

      const draftId = readPersistedDraftId()
      if (draftId) {
        scriptDraft.value = await getVideoScriptDraft(draftId)
        if (restoreFormFromDraft()) {
          draftInputFingerprint.value = currentInputFingerprint.value
          currentStep.value = 'form'
        }
        if (activeDigitalHumanId.value) {
          await loadVoiceOptions(activeDigitalHumanId.value)
        }
      }

      const taskId = readPersistedTaskId()
      if (taskId) {
        currentTask.value = await getVideoGenerationTask(taskId)
        if (currentTask.value && !TERMINAL_STATUSES.has(currentTask.value.status)) {
          currentStep.value = 'task'
          startPolling(taskId)
        } else {
          resetFlowToInitial()
        }
      }
    } catch (error) {
      errorMessage.value = resolveVideoGenerationErrorMessage(error)
      templateList.value = getFallbackVideoTemplates()
      digitalHumanList.value = getLocalDigitalHumans([])
      supportedLanguageOptions.value = [
        { value: 'Chinese', label: '中文（普通话）', status: 'available' },
        { value: 'English', label: '英语', status: 'available' },
        { value: 'Chinese,Yue', label: '粤语', status: 'available' },
      ]
    } finally {
      setLoading('bootstrap', false)
      autoSelectDefaultTemplate()
    }
  }

  function isTemplateDisabled(template: VideoTemplate) {
    return (
      template.status === 'coming_soon' ||
      template.generationReadiness === 'unavailable' ||
      template.type === 'market' ||
      template.type === 'vehicle-ad'
    )
  }

  function autoSelectDefaultTemplate() {
    if (selectedTemplate.value || scriptDraft.value || currentTask.value) return
    if (currentStep.value !== 'template') return

    const available = templateList.value.filter((item) => !isTemplateDisabled(item))
    const preferred =
      available.find((item) => item.type === 'dealership') ??
      available.find((item) => item.type === 'single-car') ??
      available[0]

    if (preferred) {
      selectTemplate(preferred)
    }
  }

  function selectTemplate(template: VideoTemplate) {
    if (
      template.status === 'coming_soon' ||
      template.generationReadiness === 'unavailable' ||
      template.type === 'market' ||
      template.type === 'vehicle-ad'
    ) {
      return
    }

    if (selectedTemplate.value?.templateId === template.templateId) {
      return
    }

    const previousTemplateId = selectedTemplate.value?.templateId
    if (previousTemplateId) {
      clearUploads()
    }

    selectedTemplate.value = template
    scriptDraft.value = null
    confirmedScriptText.value = ''
    voiceOptions.value = []
    selectedVoiceId.value = ''
    draftInputFingerprint.value = ''
    draftNeedsRegeneration.value = false
    resetAudioConfirmation()
    currentTask.value = null
    validationIssues.value = []
    clearPersistedDraftId()
    clearPersistedTaskId()
    stopPolling()
    currentStep.value = 'form'
  }

  function findTemplateForDraft(draft: VideoScriptDraft) {
    const requiredInputs = asRecord(draft.requiredInputs)
    const templateInput = asRecord(requiredInputs.template)
    const referenceMaterial = asRecord(requiredInputs.referenceMaterial)
    const candidateIds = [
      draft.templateId,
      referenceMaterial.templateId,
      referenceMaterial.id,
      templateInput.id,
    ]
      .map(asString)
      .filter(Boolean)

    const byId = templateList.value.find((item) =>
      candidateIds.some(
        (id) =>
          item.templateId === id ||
          item.id === id ||
          item.referenceMaterialId === id,
      ),
    )
    if (byId) return byId

    const templateType = asString(draft.templateType) || asString(templateInput.type)
    if (!templateType) return null
    return (
      templateList.value.find(
        (item) => item.type === templateType && !isTemplateDisabled(item),
      ) ?? null
    )
  }

  function restoreUploadItemsFromDraft(value: unknown, purpose: string) {
    if (!Array.isArray(value)) return [] as VideoUploadPreviewItem[]
    const restored: VideoUploadPreviewItem[] = []
    value.forEach((raw, index) => {
      const item = asRecord(raw)
      const assetId = asString(item.assetId)
      const url = asString(item.thumbnailUrl) || asString(item.url)
      if (!assetId || !url) return

      const fileName = asString(item.fileName) || `已上传素材 ${index + 1}`
      const asset: UploadedAsset = {
        assetId,
        purpose: asString(item.purpose) || purpose,
        url: asString(item.url) || url,
        thumbnailUrl: asString(item.thumbnailUrl) || null,
        fileName,
        mimeType: 'image/jpeg',
        size: 0,
      }

      restored.push({
        id: assetId,
        name: fileName,
        previewUrl: url,
        status: 'success',
        asset,
      })
    })
    return restored
  }

  function restoreFormFromDraft() {
    const draft = scriptDraft.value
    if (!draft) return false

    if (!selectedTemplate.value) {
      const template = findTemplateForDraft(draft)
      if (!template) return false
      selectedTemplate.value = template
    }

    const requiredInputs = asRecord(draft.requiredInputs)
    const vehicle = asRecord(requiredInputs.vehicle)
    const structured = asRecord(vehicle.structured)
    const templateInput = asRecord(requiredInputs.template)
    const digitalHuman = asRecord(requiredInputs.digitalHuman)
    const script = asRecord(requiredInputs.script)
    const vehicleProfile = asRecord(script.vehicleProfile)
    const uploadedReferences = asRecord(requiredInputs.uploadedReferences)
    const language = asString(vehicle.language) || 'Chinese'
    const digitalHumanId = asString(digitalHuman.id)

    if (selectedTemplate.value.type === 'dealership') {
      dealershipForm.value = {
        ...dealershipForm.value,
        dealershipName:
          asString(templateInput.dealershipName) ||
          dealershipForm.value.dealershipName,
        featuredVehicleNames:
          asString(templateInput.featuredVehicleNames) ||
          dealershipForm.value.featuredVehicleNames,
        digitalHumanId: digitalHumanId || dealershipForm.value.digitalHumanId,
        language,
      }
      if (!dealershipUploads.value.length) {
        dealershipUploads.value = restoreUploadItemsFromDraft(
          uploadedReferences.dealershipAssets,
          'video_reference_image',
        )
      }
      confirmedScriptText.value = asString(script.scriptText)
      translatedNarrationText.value = ''
      currentStep.value = 'form'
      return true
    }

    const nextCarForm = {
      brand:
        asString(structured.brand) ||
        asString(vehicleProfile.brand) ||
        singleCarForm.value.brand,
      modelYear:
        asString(structured.modelYear) ||
        asString(vehicleProfile.modelYear) ||
        singleCarForm.value.modelYear,
      displacement:
        asString(structured.displacement) ||
        asString(vehicleProfile.displacement) ||
        singleCarForm.value.displacement,
      salesName:
        asString(structured.salesName) ||
        asString(vehicleProfile.salesName) ||
        singleCarForm.value.salesName,
      series:
        asString(structured.series) ||
        asString(vehicleProfile.series) ||
        singleCarForm.value.series,
      digitalHumanId: digitalHumanId || singleCarForm.value.digitalHumanId,
      language,
      sellingPointHints: singleCarForm.value.sellingPointHints,
      vehicleImageSummary: singleCarForm.value.vehicleImageSummary,
    }

    if (selectedTemplate.value.type === 'promotion') {
      promotionForm.value = {
        ...promotionForm.value,
        ...nextCarForm,
        promotionText:
          asString(templateInput.promotionText) || promotionForm.value.promotionText,
      }
    } else {
      singleCarForm.value = {
        ...singleCarForm.value,
        ...nextCarForm,
      }
    }

    if (!exteriorUploads.value.length) {
      exteriorUploads.value = restoreUploadItemsFromDraft(
        uploadedReferences.vehicleExteriorAssets,
        'car_exterior',
      )
    }
    if (!interiorUploads.value.length) {
      interiorUploads.value = restoreUploadItemsFromDraft(
        uploadedReferences.vehicleInteriorAssets,
        'car_interior',
      )
    }
    if (!referenceUploads.value.length) {
      referenceUploads.value = restoreUploadItemsFromDraft(
        uploadedReferences.userReferenceAssets,
        'video_reference_image',
      )
    }

    confirmedScriptText.value = asString(script.scriptText)
    translatedNarrationText.value = ''
    currentStep.value = 'form'
    return true
  }

  function goBackToTemplate() {
    currentStep.value = 'template'
  }

  function goBackToForm() {
    if (!selectedTemplate.value && scriptDraft.value) {
      if (restoreFormFromDraft()) {
        currentStep.value = 'form'
        return
      }
      currentStep.value = 'template'
      return
    }
    if (scriptDraft.value) {
      restoreFormFromDraft()
      currentStep.value = 'form'
      return
    }
    currentStep.value = 'form'
  }

  function continueReview() {
    if (!hasReusableDraft.value) return false
    currentStep.value = 'review'
    return true
  }

  function buildValidatePayload(): Record<string, unknown> {
    const template = selectedTemplate.value
    if (!template) return {}

    if (template.type === 'dealership') {
      return {
        templateId: template.templateId,
        templateType: template.type,
        dealershipName: dealershipForm.value.dealershipName.trim(),
        dealershipImageAssetIds: dealershipUploads.value
          .filter((item) => item.asset?.assetId)
          .map((item) => item.asset!.assetId),
        digitalHumanId: dealershipForm.value.digitalHumanId,
        language: dealershipForm.value.language,
        featuredVehicleNames: dealershipForm.value.featuredVehicleNames.trim(),
        userReferenceAssetIds: referenceUploads.value
          .filter((item) => item.asset?.assetId)
          .map((item) => item.asset!.assetId),
        durationSeconds: VIDEO_DURATION_SECONDS,
      }
    }

    const form =
      template.type === 'promotion' ? promotionForm.value : singleCarForm.value

    const payload: Record<string, unknown> = {
      templateId: template.templateId,
      templateType: template.type,
      brand: form.brand.trim(),
      modelYear: form.modelYear.trim(),
      displacement: form.displacement.trim(),
      salesName: form.salesName.trim(),
      series: form.series.trim(),
      digitalHumanId: form.digitalHumanId,
      language: form.language,
      vehicleExteriorAssetIds: exteriorUploads.value
        .filter((item) => item.asset?.assetId)
        .map((item) => item.asset!.assetId),
      vehicleInteriorAssetIds: interiorUploads.value
        .filter((item) => item.asset?.assetId)
        .map((item) => item.asset!.assetId),
      userReferenceAssetIds: referenceUploads.value
        .filter((item) => item.asset?.assetId)
        .map((item) => item.asset!.assetId),
      durationSeconds: VIDEO_DURATION_SECONDS,
      sellingPointHints: form.sellingPointHints
        .split(/[\n,，;；]/)
        .map((item) => item.trim())
        .filter(Boolean),
      vehicleImageSummary: form.vehicleImageSummary.trim(),
    }

    if (template.type === 'promotion') {
      payload.promotionText = promotionForm.value.promotionText.trim()
    }

    return payload
  }

  function buildDraftPayload(): CreateVideoScriptDraftPayload {
    return buildValidatePayload() as unknown as CreateVideoScriptDraftPayload
  }

  async function ensureDigitalHumanVoiceReady(digitalHumanId: string) {
    if (isLocalOnlyDigitalHumanId(digitalHumanId)) {
      throw new Error('当前数字人仅用于界面预览，请刷新页面后重新选择')
    }
    const voice = await getDigitalHumanVoice(digitalHumanId)
    if (voice.status === 'not_configured') {
      throw new Error('该数字人音色未配置，暂不可生成视频')
    }
  }

  async function generateScriptDraft() {
    if (!selectedTemplate.value || isComingSoonTemplate.value) return null
    setLoading('draft', true)
    errorMessage.value = ''
    validationIssues.value = []
    try {
      const payload = buildValidatePayload()
      const validation = await validateTemplateInputs(
        selectedTemplate.value.templateId,
        payload,
      )
      if (!validation.valid) {
        validationIssues.value = validation.issues
        throw new Error(validation.issues[0]?.message ?? '表单校验未通过')
      }

      const digitalHumanId = String(payload.digitalHumanId ?? '')
      await ensureDigitalHumanVoiceReady(digitalHumanId)

      const draft = await createVideoScriptDraft(buildDraftPayload())
      scriptDraft.value = draft
      confirmedScriptText.value =
        draft.requiredInputs.script?.scriptText ?? ''
      translatedNarrationText.value = ''
      resetAudioConfirmation()
      await loadVoiceOptions(digitalHumanId)
      draftInputFingerprint.value = JSON.stringify(payload)
      draftNeedsRegeneration.value = false
      currentStep.value = 'review'
      persistDraftId(draft.scriptDraftId)
      return draft
    } catch (error) {
      errorMessage.value = resolveVideoGenerationErrorMessage(error)
      return null
    } finally {
      setLoading('draft', false)
    }
  }

  async function generateAudioPreview() {
    if (!scriptDraft.value?.scriptDraftId) {
      errorMessage.value = '请先生成并确认口播草稿'
      return null
    }
    if (!confirmedScriptText.value.trim()) {
      errorMessage.value = '请先确认口播文案'
      return null
    }
    if (!selectedVoiceId.value) {
      errorMessage.value = '请选择可试听的音色'
      return null
    }
    setLoading('audio', true)
    errorMessage.value = ''
    try {
      const preview = await createVideoAudioPreview({
        scriptDraftId: scriptDraft.value.scriptDraftId,
        scriptText: confirmedScriptText.value,
        voiceId: selectedVoiceId.value,
      })
      audioPreviews.value = [preview]
      confirmedAudioPreviewId.value = ''
      currentStep.value = 'review'
      scriptDraft.value = await getVideoScriptDraft(scriptDraft.value.scriptDraftId)
      confirmedScriptText.value =
        scriptDraft.value.requiredInputs.script?.scriptText ?? confirmedScriptText.value
      return preview
    } catch (error) {
      errorMessage.value = resolveVideoGenerationErrorMessage(error)
      return null
    } finally {
      setLoading('audio', false)
    }
  }

  async function optimizeNarrationScript(): Promise<OptimizeNarrationResult | null> {
    if (!scriptDraft.value?.scriptDraftId) {
      errorMessage.value = '请先生成口播文案'
      return null
    }
    if (!confirmedScriptText.value.trim()) {
      errorMessage.value = '请先填写口播文案'
      return null
    }
    if (!selectedVoiceId.value) {
      errorMessage.value = '请选择用于校准时长的音色'
      return null
    }
    setLoading('optimize', true)
    errorMessage.value = ''
    try {
      const result = await optimizeVideoNarration(scriptDraft.value.scriptDraftId, {
        scriptText: confirmedScriptText.value,
        voiceId: selectedVoiceId.value,
        baselineAudioPreviewId: audioPreviews.value[0]?.audioPreviewId,
      })
      confirmedScriptText.value = result.scriptText
      translatedNarrationText.value = ''
      audioPreviews.value = [result.preview]
      confirmedAudioPreviewId.value = ''
      currentStep.value = 'review'
      scriptDraft.value = await getVideoScriptDraft(scriptDraft.value.scriptDraftId)
      return result
    } catch (error) {
      errorMessage.value = resolveVideoGenerationErrorMessage(error)
      return null
    } finally {
      setLoading('optimize', false)
    }
  }

  async function translateNarrationScript() {
    if (!scriptDraft.value?.scriptDraftId) {
      errorMessage.value = '请先生成口播文案'
      return null
    }
    if (!confirmedScriptText.value.trim()) {
      errorMessage.value = '请先填写口播文案'
      return null
    }
    setLoading('translate', true)
    errorMessage.value = ''
    try {
      const result = await translateVideoNarration(scriptDraft.value.scriptDraftId, {
        scriptText: confirmedScriptText.value,
      })
      translatedNarrationText.value = result.scriptText
      currentStep.value = 'review'
      return result
    } catch (error) {
      errorMessage.value = resolveVideoGenerationErrorMessage(error)
      return null
    } finally {
      setLoading('translate', false)
    }
  }

  async function submitVideoTask() {
    if (!scriptDraft.value?.scriptDraftId) {
      errorMessage.value = '请先生成并确认口播草稿'
      return null
    }
    if (!confirmedAudioPreview.value?.audioPreviewId) {
      errorMessage.value = '请先试听并确认 8-15 秒内的音频'
      return null
    }

    const previousStep = currentStep.value
    currentStep.value = 'task'
    setLoading('task', true)
    errorMessage.value = ''
    try {
      const created = await createVideoGenerationTask({
        scriptDraftId: scriptDraft.value.scriptDraftId,
        audioPreviewId: confirmedAudioPreview.value.audioPreviewId,
      })
      void creditsStore.hydrateAccounts(true)
      const task = await getVideoGenerationTask(created.taskId)
      currentTask.value = task
      persistTaskId(task.taskId)
      startPolling(task.taskId)
      return task
    } catch (error) {
      currentStep.value = previousStep === 'task' ? 'review' : previousStep
      errorMessage.value = resolveVideoGenerationErrorMessage(error)
      return null
    } finally {
      setLoading('task', false)
    }
  }

  async function refreshTask(taskId = currentTask.value?.taskId) {
    if (!taskId) return null
    const task = await getVideoGenerationTask(taskId)
    currentTask.value = task
    if (task.status === 'success') {
      currentStep.value = 'result'
      clearPersistedDraftId()
      clearPersistedTaskId()
      stopPolling()
    } else if (TERMINAL_STATUSES.has(task.status)) {
      clearPersistedTaskId()
      stopPolling()
    }
    return task
  }

  function startPolling(taskId: string) {
    stopPolling()
    const poll = async () => {
      try {
        const task = await refreshTask(taskId)
        if (!task || TERMINAL_STATUSES.has(task.status)) {
          stopPolling()
          return
        }
        pollingTimer = setTimeout(
          poll,
          task.pollingRecommendedMs ?? VIDEO_TASK_POLL_MS,
        )
      } catch (error) {
        errorMessage.value = resolveVideoGenerationErrorMessage(error)
        pollingTimer = setTimeout(poll, VIDEO_TASK_POLL_MS)
      }
    }
    void poll()
  }

  async function loadHistory(page = 1, status?: string) {
    setLoading('history', true)
    try {
      const result = await getVideoGenerationTasks({ page, pageSize: 20, status })
      historyList.value = result.items ?? []
      return result
    } catch (error) {
      errorMessage.value = resolveVideoGenerationErrorMessage(error)
      return null
    } finally {
      setLoading('history', false)
    }
  }

  async function cancelCurrentTask() {
    if (!currentTask.value?.taskId) return null
    if (!CANCELABLE_STATUSES.has(currentTask.value.status)) return null
    setLoading('cancel', true)
    try {
      const task = await cancelVideoGenerationTask(currentTask.value.taskId)
      currentTask.value = task
      stopPolling()
      return task
    } catch (error) {
      errorMessage.value = resolveVideoGenerationErrorMessage(error)
      return null
    } finally {
      setLoading('cancel', false)
    }
  }

  async function regenerateTask(taskId = currentTask.value?.taskId) {
    if (!taskId) return null
    setLoading('regenerate', true)
    try {
      const created = await regenerateVideoGenerationTask(taskId)
      const task = await getVideoGenerationTask(created.taskId)
      currentTask.value = task
      persistTaskId(task.taskId)
      currentStep.value = 'task'
      startPolling(task.taskId)
      return task
    } catch (error) {
      errorMessage.value = resolveVideoGenerationErrorMessage(error)
      return null
    } finally {
      setLoading('regenerate', false)
    }
  }

  function createUploadItem(file: File): VideoUploadPreviewItem {
    const objectUrl = URL.createObjectURL(file)
    return {
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      previewUrl: objectUrl,
      objectUrl,
      status: 'uploading',
    }
  }

  function revokeUploadItem(item?: VideoUploadPreviewItem) {
    if (item?.objectUrl) URL.revokeObjectURL(item.objectUrl)
  }

  async function uploadImages(
    files: File[],
    purpose: 'car_exterior' | 'car_interior' | 'video_reference_image',
    list: typeof exteriorUploads,
    maxCount: number,
    loadingKey: string,
  ) {
    const normalized = files.filter(
      (file) =>
        file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name),
    )
    const remaining = maxCount - list.value.length
    if (remaining <= 0) return
    const batch = normalized.slice(0, remaining)
    setLoading(loadingKey, true)
    try {
      for (const file of batch) {
        const item = createUploadItem(file)
        list.value = [...list.value, item]
        try {
          const asset = await uploadAsset(file, purpose)
          list.value = list.value.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: 'success' as const, asset }
              : entry,
          )
        } catch (error) {
          list.value = list.value.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: 'fail' as const,
                  error: resolveVideoGenerationErrorMessage(error),
                }
              : entry,
          )
        }
      }
    } finally {
      setLoading(loadingKey, false)
    }
  }

  function removeUploadItem(list: typeof exteriorUploads, id: string) {
    const target = list.value.find((item) => item.id === id)
    revokeUploadItem(target)
    list.value = list.value.filter((item) => item.id !== id)
  }

  onUnmounted(() => {
    stopPolling()
    for (const item of [
      ...exteriorUploads.value,
      ...interiorUploads.value,
      ...referenceUploads.value,
      ...dealershipUploads.value,
    ]) {
      revokeUploadItem(item)
    }
  })

  return {
    currentStep,
    templateList,
    selectedTemplate,
    supportedLanguageOptions,
    digitalHumanList,
    selectedDigitalHuman,
    singleCarForm,
    promotionForm,
    dealershipForm,
    exteriorUploads,
    interiorUploads,
    referenceUploads,
    dealershipUploads,
    scriptDraft,
    confirmedScriptText,
    translatedNarrationText,
    voiceOptions,
    selectedVoiceId,
    audioPreviews,
    confirmedAudioPreviewId,
    confirmedAudioPreview,
    canSubmitVideoTask,
    hasReusableDraft,
    draftNeedsRegeneration,
    currentTask,
    historyList,
    validationIssues,
    errorMessage,
    loadingMap,
    isComingSoonTemplate,
    isLoading,
    initializeFlow,
    selectTemplate,
    goBackToTemplate,
    goBackToForm,
    continueReview,
    generateScriptDraft,
    loadVoiceOptions,
    setConfirmedScriptText,
    selectVoice,
    generateAudioPreview,
    optimizeNarrationScript,
    translateNarrationScript,
    confirmAudioPreview,
    cancelAudioPreviewConfirmation,
    submitVideoTask,
    refreshTask,
    waitForTaskCompletion,
    trackTask,
    loadHistory,
    cancelCurrentTask,
    regenerateTask,
    uploadExteriorImages: (files: File[]) =>
      uploadImages(
        files,
        'car_exterior',
        exteriorUploads,
        MAX_VIDEO_EXTERIOR_IMAGES,
        'upload-exterior',
      ),
    uploadInteriorImages: (files: File[]) =>
      uploadImages(
        files,
        'car_interior',
        interiorUploads,
        MAX_VIDEO_INTERIOR_IMAGES,
        'upload-interior',
      ),
    uploadReferenceImages: (files: File[]) =>
      uploadImages(
        files,
        'video_reference_image',
        referenceUploads,
        MAX_VIDEO_REFERENCE_IMAGES,
        'upload-reference',
      ),
    uploadDealershipImages: (files: File[]) =>
      uploadImages(
        files,
        'video_reference_image',
        dealershipUploads,
        MAX_DEALERSHIP_IMAGES,
        'upload-dealership',
      ),
    removeExteriorUpload: (id: string) => removeUploadItem(exteriorUploads, id),
    removeInteriorUpload: (id: string) => removeUploadItem(interiorUploads, id),
    removeReferenceUpload: (id: string) => removeUploadItem(referenceUploads, id),
    removeDealershipUpload: (id: string) => removeUploadItem(dealershipUploads, id),
    CANCELABLE_STATUSES,
    REGENERATABLE_STATUSES,
  }
}

export type VideoGenerationFlow = ReturnType<typeof useVideoGenerationFlow>
