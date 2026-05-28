import { computed, ref } from 'vue'

const STORAGE_KEY = 'workspace-recent-logo'
const MAX_SIZE_BYTES = 2 * 1024 * 1024
const ACCEPT_TYPES = new Set(['image/png', 'image/svg+xml'])

export interface WorkspaceLogoAsset {
  dataUrl: string
  fileName: string
  mimeType: string
  uploadedAt: string
}

function readStoredLogo(): WorkspaceLogoAsset | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as WorkspaceLogoAsset
    if (!parsed?.dataUrl || !parsed.uploadedAt) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function persistLogo(asset: WorkspaceLogoAsset | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!asset) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(asset))
}

function formatUploadLabel(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} 上传`
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('invalid_result'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('read_failed'))
    reader.readAsDataURL(file)
  })
}

export function useWorkspaceLogo() {
  const recentLogo = ref<WorkspaceLogoAsset | null>(readStoredLogo())
  const useRecentLogo = ref(Boolean(recentLogo.value))
  const isUploading = ref(false)

  const uploadedAtLabel = computed(() =>
    recentLogo.value ? formatUploadLabel(recentLogo.value.uploadedAt) : '',
  )

  function validateLogoFile(file: File): string | null {
    const isSvg = file.name.toLowerCase().endsWith('.svg')
    const typeAllowed = ACCEPT_TYPES.has(file.type) || (isSvg && file.type === '')

    if (!typeAllowed) {
      return '仅支持 PNG / SVG 格式'
    }

    if (file.size > MAX_SIZE_BYTES) {
      return 'Logo 文件不能超过 2MB'
    }

    return null
  }

  async function uploadLogoFile(file: File) {
    const validationError = validateLogoFile(file)
    if (validationError) {
      throw new Error(validationError)
    }

    isUploading.value = true

    try {
      const dataUrl = await readFileAsDataUrl(file)
      const asset: WorkspaceLogoAsset = {
        dataUrl,
        fileName: file.name,
        mimeType: file.type || (file.name.endsWith('.svg') ? 'image/svg+xml' : 'image/png'),
        uploadedAt: new Date().toISOString(),
      }

      recentLogo.value = asset
      useRecentLogo.value = true
      persistLogo(asset)

      return asset
    } finally {
      isUploading.value = false
    }
  }

  function selectRecentLogo() {
    if (!recentLogo.value) {
      return false
    }

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
    uploadedAtLabel,
    uploadLogoFile,
    selectRecentLogo,
    clearRecentLogo,
    validateLogoFile,
  }
}
