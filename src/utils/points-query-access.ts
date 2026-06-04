import type { UserInfo } from '@/types/auth'
import type { SubscriptionPlanCode } from '@/types/subscription'

export type PointsAccountScopeMode = 'self' | 'child'

export function canUseFlagshipSubAccountSwitch(input: {
  userInfo: UserInfo | null
  currentPlan: SubscriptionPlanCode
}) {
  return (
    input.currentPlan === 'flagship'
    && Boolean(input.userInfo?.canViewEnterpriseChildren)
  )
}
