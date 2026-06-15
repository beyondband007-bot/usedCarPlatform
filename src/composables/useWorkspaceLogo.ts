import { computed, ref } from 'vue'

import { uploadAsset, type UploadedAsset } from '@/api/visual-workbench'
import { formatDate } from '@/utils/dayjs'

const STORAGE_CUSTOM_LOGO = 'workspace-custom-logo'
const STORAGE_LOGO_ENABLED = 'workspace-logo-enabled'
const MAX_SIZE_BYTES = 2 * 1024 * 1024
const ACCEPT_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml'])

export interface LogoInfo {
  dataUrl: string
  assetId: string
  fileName: string
  mimeType: string
  size?: number
  uploadedAt: string
}

/** @deprecated Use LogoInfo instead */
export type WorkspaceLogoAsset = LogoInfo

function toLogoInfoFromAsset(
  asset: UploadedAsset,
  previewDataUrl?: string,
  uploadedAt = new Date().toISOString(),
): LogoInfo {
  return {
    dataUrl: previewDataUrl || asset.url,
    assetId: asset.assetId,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    size: asset.size,
    uploadedAt,
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result) {
        resolve(reader.result)
        return
      }
      reject(new Error('Logo 预览生成失败'))
    }

    reader.onerror = () => {
      reject(new Error('Logo 预览生成失败'))
    }

    reader.readAsDataURL(file)
  })
}

function readStoredCustomLogo(): LogoInfo | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(STORAGE_CUSTOM_LOGO)
    if (!raw) return null

    const parsed = JSON.parse(raw) as LogoInfo
    if (!parsed?.dataUrl || !parsed.assetId || !parsed.uploadedAt) return null

    return parsed
  } catch {
    return null
  }
}

function readStoredLogoEnabled(): boolean {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(STORAGE_LOGO_ENABLED) === 'true'
  } catch {
    return false
  }
}

function persistCustomLogo(asset: LogoInfo | null) {
  if (typeof window === 'undefined') return

  if (!asset) {
    window.localStorage.removeItem(STORAGE_CUSTOM_LOGO)
    return
  }

  window.localStorage.setItem(STORAGE_CUSTOM_LOGO, JSON.stringify(asset))
}

function persistLogoEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_LOGO_ENABLED, enabled ? 'true' : 'false')
}

function formatUploadLabel(iso: string) {
  const formatted = formatDate(iso)
  return formatted === 'Invalid Date' ? '' : formatted
}

const customLogoState = ref<LogoInfo | null>(readStoredCustomLogo())
const logoEnabledState = ref(readStoredLogoEnabled())
const isUploadingState = ref(false)
const isLoadingState = ref(false)

export function clearWorkspaceLogoCache() {
  customLogoState.value = null
  logoEnabledState.value = false
  persistCustomLogo(null)
  persistLogoEnabled(false)
}

export function useWorkspaceLogo() {
  const activeLogo = computed<LogoInfo | null>(() => customLogoState.value)

  const uploadedAtLabel = computed(() =>
    customLogoState.value ? formatUploadLabel(customLogoState.value.uploadedAt) : '',
  )

  function validateLogoFile(file: File): string | null {
    const lowerName = file.name.toLowerCase()
    const isSvg = lowerName.endsWith('.svg')
    const isJpg = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')
    const typeAllowed =
      ACCEPT_TYPES.has(file.type) ||
      (isSvg && file.type === '') ||
      (isJpg && file.type === '')

    if (!typeAllowed) return '仅支持 PNG / JPG / SVG 格式'
    if (file.size > MAX_SIZE_BYTES) return 'Logo 文件不能超过 2MB'

    return null
  }

  async function refreshDefaultLogo() {
    return customLogoState.value
  }

  async function uploadCustomLogoFile(file: File) {
    const validationError = validateLogoFile(file)
    if (validationError) throw new Error(validationError)

    isUploadingState.value = true

    try {
      const previewDataUrl = await readFileAsDataUrl(file)
      const uploaded = await uploadAsset(file, 'logo')
      const asset = toLogoInfoFromAsset(uploaded, previewDataUrl)

      customLogoState.value = asset
      persistCustomLogo(asset)

      return asset
    } finally {
      isUploadingState.value = false
    }
  }

  function setLogoEnabled(enabled: boolean) {
    logoEnabledState.value = enabled
    persistLogoEnabled(enabled)
  }

  function removeCustomLogo() {
    clearWorkspaceLogoCache()
  }

  return {
    customLogo: customLogoState,
    logoEnabled: logoEnabledState,
    activeLogo,
    uploadedAtLabel,
    isUploading: isUploadingState,
    isLoading: isLoadingState,
    refreshDefaultLogo,
    uploadCustomLogoFile,
    setLogoEnabled,
    removeCustomLogo,
    validateLogoFile,
    /** @deprecated Use activeLogo instead */
    recentLogo: activeLogo,
    /** @deprecated Use logoEnabled instead */
    useRecentLogo: logoEnabledState,
    /** @deprecated Use uploadCustomLogoFile instead */
    uploadLogoFile: uploadCustomLogoFile,
    /** @deprecated No-op kept for compatibility */
    selectRecentLogo: () => Boolean(customLogoState.value),
    /** @deprecated Use removeCustomLogo instead */
    clearRecentLogo: removeCustomLogo,
  }
}
