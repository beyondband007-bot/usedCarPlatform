import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import duration from 'dayjs/plugin/duration'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isBetween from 'dayjs/plugin/isBetween'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'

// 设置中文
dayjs.locale('zh-cn')

// 注册插件
dayjs.extend(relativeTime)
dayjs.extend(advancedFormat)
dayjs.extend(customParseFormat)
dayjs.extend(duration)
dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
dayjs.extend(isBetween)
dayjs.extend(weekOfYear)
dayjs.extend(quarterOfYear)

// 导出配置好的 dayjs
export { dayjs }

// 常用格式化函数
export const formatDate = (
  date: dayjs.ConfigType,
  format = 'YYYY-MM-DD HH:mm:ss'
): string => {
  return dayjs(date).format(format)
}

// 格式化日期（仅日期部分）
export const formatDateOnly = (date: dayjs.ConfigType): string => {
  return dayjs(date).format('YYYY-MM-DD')
}

// 格式化时间（仅时间部分）
export const formatTimeOnly = (date: dayjs.ConfigType): string => {
  return dayjs(date).format('HH:mm:ss')
}

// 友好时间显示
export const formatRelativeTime = (date: dayjs.ConfigType): string => {
  return dayjs(date).fromNow()
}

// 获取时间差（毫秒）
export const getDiff = (
  date1: dayjs.ConfigType,
  date2: dayjs.ConfigType,
  unit?: dayjs.UnitType
): number => {
  return dayjs(date1).diff(dayjs(date2), unit)
}

// 获取剩余时间（用于倒计时）
export const getRemainingTime = (
  targetDate: dayjs.ConfigType
): { days: number; hours: number; minutes: number; seconds: number } => {
  const now = dayjs()
  const target = dayjs(targetDate)
  const diff = target.diff(now, 'second')

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  const days = Math.floor(diff / (24 * 60 * 60))
  const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((diff % (60 * 60)) / 60)
  const seconds = diff % 60

  return { days, hours, minutes, seconds }
}

// 检查日期是否过期
export const isExpired = (date: dayjs.ConfigType): boolean => {
  return dayjs().isAfter(dayjs(date))
}

// 获取时间段
export const getTimeRange = (
  type: 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year'
): { start: string; end: string } => {
  const now = dayjs()
  let start: dayjs.Dayjs
  let end: dayjs.Dayjs

  switch (type) {
    case 'today':
      start = now.startOf('day')
      end = now.endOf('day')
      break
    case 'yesterday':
      start = now.subtract(1, 'day').startOf('day')
      end = now.subtract(1, 'day').endOf('day')
      break
    case 'week':
      start = now.startOf('week')
      end = now.endOf('week')
      break
    case 'month':
      start = now.startOf('month')
      end = now.endOf('month')
      break
    case 'quarter':
      start = now.startOf('quarter')
      end = now.endOf('quarter')
      break
    case 'year':
      start = now.startOf('year')
      end = now.endOf('year')
      break
    default:
      start = now
      end = now
  }

  return {
    start: start.format('YYYY-MM-DD HH:mm:ss'),
    end: end.format('YYYY-MM-DD HH:mm:ss'),
  }
}

// 格式化时长（秒转 00:00:00）
export const formatDuration = (seconds: number): string => {
  const durationObj = dayjs.duration(seconds, 'seconds')
  const hours = Math.floor(durationObj.asHours())
  const mins = durationObj.minutes()
  const secs = durationObj.seconds()
  
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// 常用时间常量
export const TIME_FORMATS = {
  full: 'YYYY-MM-DD HH:mm:ss',
  date: 'YYYY-MM-DD',
  time: 'HH:mm:ss',
  yearMonth: 'YYYY-MM',
  monthDay: 'MM-DD',
  hourMinute: 'HH:mm',
  chinese: 'YYYY年MM月DD日',
  chineseFull: 'YYYY年MM月DD日 HH时mm分',
} as const

export default dayjs