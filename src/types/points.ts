export type PointRecordType = 'recharge' | 'consume' | 'gift' | 'refund'

export interface PointsSummary {
  currentPoints: number
  freezePoints: number
  totalConsume: number
  totalRecharge: number
  currentRunningTasks: number
}

export interface PointRecord {
  id: string
  type: PointRecordType
  title: string
  amount: number
  balance: number
  createdAt: string
  remark: string
}
