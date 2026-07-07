export const MAX_VEHICLE_LIBRARY_VIDEO_MB = 50
export const MAX_VEHICLE_LIBRARY_VIDEO_SECONDS = 60

export function readVideoDurationSeconds(file: File): Promise<number> {
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
      const duration = video.duration
      cleanup()
      resolve(duration)
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('无法读取视频时长，请更换文件后重试'))
    }

    video.src = url
  })
}

export async function validateVehicleLibraryVideo(
  file: File,
  options: { maxMb?: number; maxSeconds?: number } = {},
): Promise<string> {
  const maxMb = options.maxMb ?? MAX_VEHICLE_LIBRARY_VIDEO_MB
  const maxSeconds = options.maxSeconds ?? MAX_VEHICLE_LIBRARY_VIDEO_SECONDS

  if (file.size > maxMb * 1024 * 1024) {
    return `不能超过 ${maxMb}MB，请压缩后重试`
  }

  try {
    const duration = await readVideoDurationSeconds(file)
    if (!Number.isFinite(duration) || duration <= 0) {
      return '无法读取视频时长，请更换文件后重试'
    }
    if (duration > maxSeconds) {
      return `时长不能超过 ${maxSeconds} 秒，请剪辑后重试`
    }
  }
  catch (error) {
    return error instanceof Error ? error.message : '无法读取视频时长，请更换文件后重试'
  }

  return ''
}
