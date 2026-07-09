import { UPLOAD_LIMITS } from '@/constants/upload'

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

function getImageInfo(path: string): Promise<{ width: number, height: number }> {
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src: path,
      success: result => resolve({ width: result.width, height: result.height }),
      fail: error => reject(new Error(error.errMsg || '无法读取图片尺寸，请更换文件后重试')),
    })
  })
}

function getVideoInfo(path: string): Promise<{ width: number, height: number, duration: number }> {
  return new Promise((resolve, reject) => {
    uni.getVideoInfo({
      src: path,
      success: result => resolve({
        width: result.width,
        height: result.height,
        duration: result.duration,
      }),
      fail: error => reject(new Error(error.errMsg || '无法读取视频信息，请更换文件后重试')),
    })
  })
}

export async function validateArkImagePath(path: string): Promise<string> {
  try {
    const { width, height } = await getImageInfo(path)
    return arkImageWidthError(width, height)
  }
  catch (error) {
    return error instanceof Error ? error.message : '无法读取图片尺寸，请更换文件后重试'
  }
}

export async function validateArkVideoPath(path: string, fileSize?: number): Promise<string> {
  if (fileSize && fileSize > UPLOAD_LIMITS.maxVideoSize) {
    return `不能超过 ${Math.round(UPLOAD_LIMITS.maxVideoSize / 1024 / 1024)}MB，请压缩后重试`
  }

  try {
    const { width, height, duration } = await getVideoInfo(path)
    const widthError = arkVideoWidthError(width, height)
    if (widthError)
      return widthError
    if (!Number.isFinite(duration) || duration <= 0) {
      return '无法读取视频时长，请更换文件后重试'
    }
    if (duration > UPLOAD_LIMITS.maxVideoDuration) {
      return `时长不能超过 ${UPLOAD_LIMITS.maxVideoDuration} 秒，请剪辑后重试`
    }
  }
  catch (error) {
    return error instanceof Error ? error.message : '无法读取视频信息，请更换文件后重试'
  }

  return ''
}
