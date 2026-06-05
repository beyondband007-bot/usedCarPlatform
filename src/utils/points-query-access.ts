import type { UserInfo } from '@/types/auth'
import type { SubscriptionPlanCode } from '@/types/subscription'

export type PointsAccountScopeMode = 'self' | 'child'

export function canUseFlagshipSubAccountSwitch(input: {
  userInfo: UserInfo | null
  currentPlan: SubscriptionPlanCode
}) {
  const isEnterpriseMotherAccount =
    input.userInfo?.enterpriseAccountRole === 'mother'
    || Boolean(input.userInfo?.canViewEnterpriseChildren && input.userInfo?.enterpriseTenantId)

  return (
    Boolean(input.userInfo)
    && (
      isEnterpriseMotherAccount
      || (
        input.currentPlan === 'flagship'
        && Boolean(input.userInfo?.canViewEnterpriseChildren)
      )
    )
  )
}
