import type { CreditsTransaction } from '@/api/visual-workbench'
import { pointsSummaryIcons } from '@/constants/points-page'
import type {
  PointsBizSource,
  PointsFlowRecord,
  PointsSummaryCard,
  PointsTxnType,
} from '@/types/points-query'

const functionNameMap: Record<string, string> = {
  'showroom-light': '展厅光影',
  'outdoor-scene': '户外街景',
  'road-motion': '公路动感',
  'sky-studio': '天空棚拍',
  'paint-refresh': '漆面翻新',
  'light-consistency': '光影一致',
  'interior-clean': '内饰清洁',
  'interior-collage': '内饰拼图',
  'watermark-remove': '去水印',
  'creative-image': '创意图',
  'short-video': '短视频',
  'batch-new-exterior': '批量外观',
  'batch-new-interior': '批量内饰',
}

function parsePoints(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function formatPoints(value: number) {
  return Math.round(value).toLocaleString('zh-CN')
}

export function mapCreditsTxnType(
  txnType: string,
  points: number,
): PointsTxnType {
  if (txnType === 'recharge') return 'recharge'
  if (txnType === 'refund') return 'refund'
  if (['grant', 'bonus', 'commission_grant'].includes(txnType)) return 'gift'
  if (['settle', 'freeze', 'estimate'].includes(txnType)) return 'consume'
  if (txnType === 'adjustment' || txnType === 'adjust') {
    return points >= 0 ? 'gift' : 'consume'
  }
  return points >= 0 ? 'gift' : 'consume'
}

export function mapCreditsBizSource(
  txnType: PointsTxnType,
  bizType?: string | null,
): PointsBizSource {
  const normalized = (bizType ?? '').toLowerCase()
  if (txnType === 'recharge') return 'purchase'
  if (txnType === 'gift') return 'package'
  if (txnType === 'refund') return 'fail'
  if (normalized.includes('batch')) return 'batch'
  return 'single'
}

function resolveSceneTitle(txnType: PointsTxnType, bizType?: string | null) {
  const normalized = (bizType ?? '').toLowerCase()
  if (txnType === 'recharge') return '充值购买'
  if (txnType === 'gift') return '套餐赠送'
  if (txnType === 'refund') return '失败退款'
  if (normalized.includes('batch')) return '批量上新'
  if (normalized.includes('video')) return '短视频生成'
  return '单图生成'
}

function resolveFunctionName(bizType?: string | null, remark?: string | null) {
  const normalized = (bizType ?? '').toLowerCase()
  for (const [code, label] of Object.entries(functionNameMap)) {
    if (normalized.includes(code)) return label
  }
  if (remark?.trim()) return remark.trim()
  if (normalized.includes('batch')) return '批量生成'
  if (normalized.includes('generation')) return '图像生成'
  return '积分服务'
}

export function mapCreditsTransactionToFlowRecord(
  transaction: CreditsTransaction,
): PointsFlowRecord {
  const pointsChange = parsePoints(transaction.points)
  const txnType = mapCreditsTxnType(String(transaction.txnType), pointsChange)
  const bizSource = mapCreditsBizSource(txnType, transaction.bizType)

  const status = txnType === 'gift' ? 'pending' : 'effective'

  return {
    id: `TXN-${transaction.id}`,
    txnType,
    pointsChange,
    balanceAfter: parsePoints(transaction.balanceAfter),
    bizSource,
    title: resolveSceneTitle(txnType, transaction.bizType),
    functionName: resolveFunctionName(transaction.bizType, transaction.remark),
    remark: transaction.remark?.trim() || transaction.bizId || '-',
    createdAt: formatDateTime(transaction.createdAt),
    status,
    validityPeriod:
      txnType === 'gift' || txnType === 'recharge' ? '2026-12-31' : '-',
  }
}

export function buildPersonalSummaryCards(input: {
  availableBalance: number
  records: PointsFlowRecord[]
}): PointsSummaryCard[] {
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

  let totalGained = 0
  let totalConsumed = 0
  let recentNet = 0

  for (const record of input.records) {
    if (record.pointsChange > 0) totalGained += record.pointsChange
    else totalConsumed += Math.abs(record.pointsChange)

    const createdAt = new Date(record.createdAt.replace(/-/g, '/')).getTime()
    if (!Number.isNaN(createdAt) && createdAt >= thirtyDaysAgo) {
      recentNet += record.pointsChange
    }
  }

  const recentPrefix = recentNet > 0 ? '+' : recentNet < 0 ? '' : ''

  return [
    {
      key: 'availableBalance',
      label: '当前可用积分',
      value: formatPoints(input.availableBalance),
      unit: '积分',
      icon: pointsSummaryIcons.available,
      tone: 'blue',
    },
    {
      key: 'totalGained',
      label: '累计获得',
      value: formatPoints(totalGained),
      unit: '积分',
      icon: pointsSummaryIcons.gained,
      tone: 'emerald',
    },
    {
      key: 'totalConsumed',
      label: '累计消费',
      value: formatPoints(totalConsumed),
      unit: '积分',
      icon: pointsSummaryIcons.consumed,
      tone: 'rose',
    },
    {
      key: 'recentNet',
      label: '近30天净变动',
      value: `${recentPrefix}${formatPoints(recentNet)}`,
      unit: '积分',
      icon: pointsSummaryIcons.recentNet,
      tone: 'amber',
    },
  ]
}
