import Compressor from 'compressorjs'

import type { CompressorOptions } from '@/composables/useImageCompressor'

const SKIP_COMPRESS_THRESHOLD = 150 * 1024

const PHOTO_COMPRESS_OPTIONS: CompressorOptions = {
  quality: 0.85,
  maxWidth: 4096,
  maxHeight: 4096,
  checkOrientation: true,
  convertSize: 2 * 1024 * 1024,
}

const LOGO_COMPRESS_OPTIONS: CompressorOptions = {
  quality: 0.92,
  maxWidth: 2048,
  maxHeight: 2048,
  checkOrientation: true,
}

export type UploadImageKind = 'photo' | 'logo'

function isSvgFile(file: File) {
  return (
    file.type === 'image/svg+xml' ||
    file.name.toLowerCase().endsWith('.svg')
  )
}

function isRasterImage(file: File) {
  if (file.type.startsWith('image/')) {
    return !isSvgFile(file)
  }

  return /\.(jpe?g|png|webp|heic|heif|bmp)$/i.test(file.name)
}

function toUploadFile(result: File | Blob, original: File) {
  if (result instanceof File) {
    return result
  }

  const extension =
    result.type === 'image/png'
      ? '.png'
      : result.type === 'image/webp'
        ? '.webp'
        : '.jpg'
  const baseName = original.name.replace(/\.[^.]+$/, '') || 'upload'

  return new File([result], `${baseName}${extension}`, {
    type: result.type || original.type || 'image/jpeg',
    lastModified: original.lastModified,
  })
}

function runCompressor(file: File, options: CompressorOptions) {
  return new Promise<File | Blob>((resolve, reject) => {
    new Compressor(file, {
      ...options,
      success: resolve,
      error: reject,
    })
  })
}

export async function compressUploadImage(
  file: File,
  kind: UploadImageKind = 'photo',
): Promise<File> {
  if (!isRasterImage(file) || file.size <= SKIP_COMPRESS_THRESHOLD) {
    return file
  }

  const options =
    kind === 'logo' ? LOGO_COMPRESS_OPTIONS : PHOTO_COMPRESS_OPTIONS

  try {
    const result = await runCompressor(file, options)
    const compressed = toUploadFile(result, file)

    if (compressed.size >= file.size) {
      return file
    }

    return compressed
  } catch {
    return file
  }
}
