import type { PointRecord, PointsSummary } from '@/types/points'

import { mockDelay, readMockStorage, writeMockStorage } from './mock-storage'

const SUMMARY_KEY = 'ai-car-studio:points-summary'
const RECORDS_KEY = 'ai-car-studio:points-records'

const initialSummary: PointsSummary = {
  currentPoints: 55000,
  freezePoints: 0,
  totalConsume: 8320,
  totalRecharge: 3980,
  currentRunningTasks: 3,
}

const initialRecords: PointRecord[] = [
  {
    id: 'point_20260520090001',
    type: 'gift',
    title: '套餐赠送',
    amount: 55000,
    balance: 55000,
    createdAt: '2026-05-20 09:00:00',
    remark: '企业团队版开通',
  },
  {
    id: 'point_20260520093202',
    type: 'consume',
    title: '单图生成',
    amount: -30,
    balance: 54970,
    createdAt: '2026-05-20 09:32:18',
    remark: 'AI场景生成消耗',
  },
  {
    id: 'point_20260520091803',
    type: 'consume',
    title: '批量上新任务',
    amount: -120,
    balance: 54865,
    createdAt: '2026-05-20 09:18:45',
    remark: '5月展厅批量上新',
  },
]

export async function getPoints() {
  return mockDelay(readMockStorage(SUMMARY_KEY, initialSummary))
}

export async function getPointRecords() {
  return mockDelay(readMockStorage(RECORDS_KEY, initialRecords))
}

export async function addRechargePoints(input: {
  amount: number
  points: number
  title: string
}) {
  const summary = readMockStorage(SUMMARY_KEY, initialSummary)
  const nextSummary: PointsSummary = {
    ...summary,
    currentPoints: summary.currentPoints + input.points,
    totalRecharge: summary.totalRecharge + input.amount,
  }

  const records = readMockStorage(RECORDS_KEY, initialRecords)
  const nextRecord: PointRecord = {
    id: `point_${Date.now()}`,
    type: 'recharge',
    title: input.title,
    amount: input.points,
    balance: nextSummary.currentPoints,
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    remark: `充值 ${input.amount} 元`,
  }

  writeMockStorage(SUMMARY_KEY, nextSummary)
  writeMockStorage(RECORDS_KEY, [nextRecord, ...records])

  return mockDelay({
    summary: nextSummary,
    records: [nextRecord, ...records],
  })
}

export async function consumePoints(input: { points: number; title: string; remark?: string }) {
  const summary = readMockStorage(SUMMARY_KEY, initialSummary)
  const nextSummary: PointsSummary = {
    ...summary,
    currentPoints: Math.max(0, summary.currentPoints - input.points),
    totalConsume: summary.totalConsume + input.points,
  }
  const records = readMockStorage(RECORDS_KEY, initialRecords)
  const nextRecord: PointRecord = {
    id: `point_${Date.now()}`,
    type: 'consume',
    title: input.title,
    amount: -input.points,
    balance: nextSummary.currentPoints,
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    remark: input.remark ?? '任务消费',
  }

  writeMockStorage(SUMMARY_KEY, nextSummary)
  writeMockStorage(RECORDS_KEY, [nextRecord, ...records])

  return mockDelay({
    summary: nextSummary,
    records: [nextRecord, ...records],
  })
}
