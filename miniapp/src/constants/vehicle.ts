import type { VehicleTaskStatus } from '@/types/vehicle'

export const VEHICLE_STATUS_TEXT: Record<VehicleTaskStatus, string> = {
  draft: '草稿',
  waiting_capture: '待拍摄',
  capturing: '拍摄中',
  waiting_complete: '待补充',
  uploading: '上传中',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
}

export const VEHICLE_STATUS_COLOR: Record<VehicleTaskStatus, string> = {
  draft: '#6B7280',
  waiting_capture: '#3B82F6',
  capturing: '#2563EB',
  waiting_complete: '#F59E0B',
  uploading: '#0EA5E9',
  processing: '#8B5CF6',
  completed: '#16A34A',
  failed: '#EF4444',
}

export const VEHICLE_FILTER_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: VEHICLE_STATUS_TEXT.waiting_capture, value: 'waiting_capture' },
  { label: VEHICLE_STATUS_TEXT.capturing, value: 'capturing' },
  { label: VEHICLE_STATUS_TEXT.waiting_complete, value: 'waiting_complete' },
  { label: VEHICLE_STATUS_TEXT.uploading, value: 'uploading' },
  { label: VEHICLE_STATUS_TEXT.processing, value: 'processing' },
  { label: VEHICLE_STATUS_TEXT.completed, value: 'completed' },
  { label: VEHICLE_STATUS_TEXT.failed, value: 'failed' },
] as const
