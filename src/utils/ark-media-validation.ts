export const ARK_MEDIA_MIN_WIDTH = 300
export const ARK_MEDIA_MAX_WIDTH = 6000

export function arkImageWidthError(width: number, height: number): string {
  if (width < ARK_MEDIA_MIN_WIDTH) {
    return `图片宽度不能小于 ${ARK_MEDIA_MIN_WIDTH}px（当前 ${width}px），请换一张更清晰的照片`
  }
  if (width > ARK_MEDIA_MAX_WIDTH) {
    return `图片宽度不能超过 ${ARK_MEDIA_MAX_WIDTH}px（当前 ${width}px）`
  }
  if (height < ARK_MEDIA_MIN_WIDTH) {
    return `图片高度不能小于 ${ARK_MEDIA_MIN_WIDTH}px（当前 ${height}px），请换一张更清晰的照片`
  }
  return ''
}

export function arkVideoWidthError(width: number, height: number): string {
  if (width < ARK_MEDIA_MIN_WIDTH) {
    return `视频宽度不能小于 ${ARK_MEDIA_MIN_WIDTH}px（当前 ${width}px），长视频生成会截取参考帧，请使用更高清的视频重新拍摄`
  }
  if (height < ARK_MEDIA_MIN_WIDTH) {
    return `视频高度不能小于 ${ARK_MEDIA_MIN_WIDTH}px（当前 ${height}px），请使用更高清的视频重新拍摄`
  }
  return ''
}

export function readImageFileDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    const cleanup = () => URL.revokeObjectURL(url)
    image.onload = () => {
      cleanup()
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => {
      cleanup()
      reject(new Error('无法读取图片尺寸，请更换文件后重试'))
    }
    image.src = url
  })
}

export function readVideoFileDimensions(
  file: File,
): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    const cleanup = () => {
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      video.load()
    }
    video.onloadedmetadata = () => {
      const result = {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      }
      cleanup()
      resolve(result)
    }
    video.onerror = () => {
      cleanup()
      reject(new Error('无法读取视频信息，请更换文件后重试'))
    }
    video.src = url
  })
}

export async function validateArkImageFile(file: File): Promise<string> {
  try {
    const { width, height } = await readImageFileDimensions(file)
    return arkImageWidthError(width, height)
  } catch (error) {
    return error instanceof Error ? error.message : '无法读取图片尺寸，请更换文件后重试'
  }
}

export function validateArkMaterialDimensions(input: {
  width?: number | null
  height?: number | null
  mediaType: 'image' | 'video'
}): string {
  const width = input.width ?? 0
  const height = input.height ?? 0
  if (!width || !height) return ''
  return input.mediaType === 'video'
    ? arkVideoWidthError(width, height)
    : arkImageWidthError(width, height)
}
