import { request } from './http'
import type { CreditsAccount } from './visual-workbench'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
  requestId: string
}

export interface EnterpriseChildMember {
  id: string
  username: string
  displayName: string
  memberRole: string
  creditsUserId: number | null
  accountScope: 'personal' | 'tenant'
  creditsTenantId: number | null
}

export interface EnterpriseCreditsMember extends EnterpriseChildMember {
  isOwner: boolean
}

export interface EnterpriseCreditsTransaction {
  id: number
  txnType: string
  points: string
  balanceBefore: string
  balanceAfter: string
  bizType: string | null
  bizId: string | null
  remark: string | null
  createdAt: string
  operatorUserId: string
  operatorName: string
  operatorRole: 'owner' | 'admin' | 'member'
  isOwner: boolean
}

export interface EnterpriseCreditsOverview {
  team: {
    id: string
    name: string
  }
  account: CreditsAccount | null
  members: EnterpriseCreditsMember[]
  transactions: EnterpriseCreditsTransaction[]
}

export async function getEnterpriseChildMembers() {
  const response = await request.get<
    ApiResponse<{ items?: EnterpriseChildMember[] }>
  >('/enterprise/members')
  return response.data.items ?? []
}

export async function getEnterpriseCreditsOverview() {
  const response = await request.get<ApiResponse<EnterpriseCreditsOverview>>(
    '/enterprise/credits/overview',
  )
  return response.data
}
