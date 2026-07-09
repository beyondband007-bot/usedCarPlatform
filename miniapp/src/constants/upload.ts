export const UPLOAD_LIMITS = {
  maxSize: Number(import.meta.env.VITE_UPLOAD_MAX_SIZE || 20 * 1024 * 1024),
  maxVideoSize: Number(import.meta.env.VITE_UPLOAD_MAX_VIDEO_SIZE || 100 * 1024 * 1024),
  maxVideoDuration: Number(import.meta.env.VITE_UPLOAD_MAX_VIDEO_DURATION || 60),
  minMediaWidth: 300,
  concurrency: Number(import.meta.env.VITE_UPLOAD_CONCURRENCY || 2),
  maxRetryCount: 2,
  acceptExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  acceptVideoExtensions: ['mp4', 'mov'],
} as const

export const UPLOAD_STATUS_TEXT = {
  waiting: '等待上传',
  uploading: '上传中',
  success: '上传成功',
  failed: '上传失败',
  cancelled: '已取消',
} as const
