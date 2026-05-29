import { computed, ref } from 'vue'

import {
  getDefaultLogo,
  uploadDefaultLogo,
  type UserLogoSetting,
} from '@/api/visual-workbench'
import { formatDate } from '@/utils/dayjs'

const STORAGE_KEY = 'workspace-recent-logo'
const MAX_SIZE_BYTES = 2 * 1024 * 1024
const ACCEPT_TYPES = new Set(['image/png', 'image/svg+xml'])

export interface WorkspaceLogoAsset {
  dataUrl: string
  assetId?: string
  fileName: string
  mimeType: string
  size?: number
  uploadedAt: string
}

function toLogoAsset(setting: UserLogoSetting): WorkspaceLogoAsset {
  return {
    dataUrl: setting.logo.url,
    assetId: setting.logoAssetId,
    fileName: setting.logo.fileName,
    mimeType: setting.logo.mimeType,
    size: setting.logo.size,
    uploadedAt: setting.updatedAt,
  }
}

function readStoredLogo(): WorkspaceLogoAsset | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as WorkspaceLogoAsset
    if (!parsed?.dataUrl || !parsed.uploadedAt) return null

    return parsed
  } catch {
    return null
  }
}

function persistLogo(asset: WorkspaceLogoAsset | null) {
  if (typeof window === 'undefined') return

  if (!asset) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(asset))
}

function formatUploadLabel(iso: string) {
  const formatted = formatDate(iso)
  return formatted === 'Invalid Date' ? '' : formatted
}

export function useWorkspaceLogo() {
  const recentLogo = ref<WorkspaceLogoAsset | null>(readStoredLogo())
  const useRecentLogo = ref(Boolean(recentLogo.value))
  const isUploading = ref(false)
  const isLoading = ref(false)

  const uploadedAtLabel = computed(() =>
    recentLogo.value ? formatUploadLabel(recentLogo.value.uploadedAt) : '',
  )

  function validateLogoFile(file: File): string | null {
    const isSvg = file.name.toLowerCase().endsWith('.svg')
    const typeAllowed = ACCEPT_TYPES.has(file.type) || (isSvg && file.type === '')

    if (!typeAllowed) return '仅支持 PNG / SVG 格式'
    if (file.size > MAX_SIZE_BYTES) return 'Logo 文件不能超过 2MB'

    return null
  }

  async function refreshDefaultLogo() {
    isLoading.value = true

    try {
      const setting = await getDefaultLogo()
      const asset = setting ? toLogoAsset(setting) : null
      recentLogo.value = asset
      useRecentLogo.value = Boolean(asset)
      persistLogo(asset)
      return asset
    } finally {
      isLoading.value = false
    }
  }

  async function uploadLogoFile(file: File) {
    const validationError = validateLogoFile(file)
    if (validationError) throw new Error(validationError)

    isUploading.value = true

    try {
      const setting = await uploadDefaultLogo(file)
      const asset = toLogoAsset(setting)

      recentLogo.value = asset
      useRecentLogo.value = true
      persistLogo(asset)

      return asset
    } finally {
      isUploading.value = false
    }
  }

  function selectRecentLogo() {
    if (!recentLogo.value) return false

    useRecentLogo.value = true
    return true
  }

  function clearRecentLogo() {
    recentLogo.value = null
    useRecentLogo.value = false
    persistLogo(null)
  }

  return {
    recentLogo,
    useRecentLogo,
    isUploading,
    isLoading,
    uploadedAtLabel,
    refreshDefaultLogo,
    uploadLogoFile,
    selectRecentLogo,
    clearRecentLogo,
    validateLogoFile,
  }
}
