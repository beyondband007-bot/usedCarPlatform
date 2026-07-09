import type { CapturePosition } from '@/types/upload'

/** 与车辆库素材槽保持一致的 5 项必拍素材 */
export const DEFAULT_CAPTURE_POSITIONS: CapturePosition[] = [
  { code: 'front_image', name: '车头图', category: 'exterior', mediaType: 'image', required: true, description: '正面拍摄完整车头', sort: 10 },
  { code: 'rear_image', name: '车尾图', category: 'exterior', mediaType: 'image', required: true, description: '正面拍摄完整车尾', sort: 20 },
  { code: 'driver_image', name: '主驾驶图', category: 'interior', mediaType: 'image', required: true, description: '从主驾驶位拍摄车内前排', sort: 30 },
  { code: 'front_row_video', name: '前排视频', category: 'video', mediaType: 'video', required: true, description: '拍摄前排座椅及中控区域', sort: 40 },
  { code: 'rear_row_video', name: '后排视频', category: 'video', mediaType: 'video', required: true, description: '拍摄后排座椅区域', sort: 50 },
]

export const CAPTURE_POSITION_MAP = Object.fromEntries(
  DEFAULT_CAPTURE_POSITIONS.map(item => [item.code, item]),
) as Record<string, CapturePosition>

export const LOT_REQUIRED_SLOT_CODES = ['lot_image', 'lot_video'] as const

/** 与车辆库车场素材槽保持一致 */
export const DEFAULT_LOT_CAPTURE_POSITIONS: CapturePosition[] = [
  { code: 'lot_image', name: '车场图片', category: 'exterior', mediaType: 'image', required: true, description: '拍摄车场全景或门头', sort: 10 },
  { code: 'lot_video', name: '车场视频', category: 'video', mediaType: 'video', required: true, description: '拍摄车场环境视频', sort: 20 },
]

export const LOT_CAPTURE_POSITION_MAP = Object.fromEntries(
  DEFAULT_LOT_CAPTURE_POSITIONS.map(item => [item.code, item]),
) as Record<string, CapturePosition>

export const LOT_MATERIAL_STATUS_TEXT = {
  incomplete: '待补素材',
  complete: '素材完整',
} as const
