import type { UserInfo } from '@/types/auth'
import type { SubscriptionPlanCode } from '@/types/subscription'

export type PointsAccountScopeMode = 'self' | 'child'

export function canUseFlagshipSubAccountSwitch(input: {
  userInfo: UserInfo | null
  currentPlan: SubscriptionPlanCode
}) {
  const isEnterpriseOwnerIdentity =
    Boolean(
      input.userInfo?.enterpriseTenantId
      && input.userInfo?.enterpriseMemberRole === 'owner'
      && (
        input.userInfo?.enterpriseOwnerUserId === input.userInfo?.id
        || input.userInfo?.enterpriseSubscriptionUserId === input.userInfo?.id
      ),
    )

  const isEnterpriseMotherAccount =
    input.userInfo?.enterpriseAccountRole === 'mother'
    || Boolean(input.userInfo?.canViewEnterpriseChildren && input.userInfo?.enterpriseTenantId)
    || isEnterpriseOwnerIdentity

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
