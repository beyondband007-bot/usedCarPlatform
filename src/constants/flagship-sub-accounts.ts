import type { EnterpriseChildMember } from '@/api/enterprise'

/** Mock fallback when enterprise members API is unavailable in local dev. */
export const flagshipSubAccountFallback: EnterpriseChildMember[] = [
  {
    id: 'user_flagship_sub_sales',
    username: 'flagship_sub_sales',
    displayName: '旗舰子账号-销售',
    memberRole: 'admin',
    creditsUserId: 5,
    accountScope: 'personal',
    creditsTenantId: null,
  },
  {
    id: 'user_flagship_sub_ops',
    username: 'flagship_sub_ops',
    displayName: '旗舰子账号-运营',
    memberRole: 'member',
    creditsUserId: 5,
    accountScope: 'personal',
    creditsTenantId: null,
  },
  {
    id: 'user_flagship_sub_design',
    username: 'flagship_sub_design',
    displayName: '旗舰子账号-设计',
    memberRole: 'member',
    creditsUserId: 5,
    accountScope: 'personal',
    creditsTenantId: null,
  },
]
