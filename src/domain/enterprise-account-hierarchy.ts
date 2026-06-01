import type { CreditAccount, CreditTransaction } from '@/api/visual-workbench'
import type { SubscriptionPlanCode } from '@/types/subscription'

export type EnterpriseAccountRelation = 'mother' | 'child' | 'standalone'

export interface EnterpriseAccountView extends CreditAccount {
  relation: EnterpriseAccountRelation
  displayName: string
  parentAccountId?: number
  synthetic?: boolean
}

interface ChildAccountProfile {
  suffix: string
  displayName: string
  availableBalance: string
  lockedBalance: string
  totalBalance: string
}

const flagshipChildProfiles: ChildAccountProfile[] = [
  {
    suffix: 'child-1',
    displayName: '子账号 1 · 外观图组',
    availableBalance: '120000.0000',
    lockedBalance: '3000.0000',
    totalBalance: '123000.0000',
  },
  {
    suffix: 'child-2',
    displayName: '子账号 2 · 内饰图组',
    availableBalance: '98000.0000',
    lockedBalance: '1200.0000',
    totalBalance: '99200.0000',
  },
  {
    suffix: 'child-3',
    displayName: '子账号 3 · 批量上新',
    availableBalance: '76000.0000',
    lockedBalance: '0.0000',
    totalBalance: '76000.0000',
  },
]

export function canMotherAccountViewChildren(plan: SubscriptionPlanCode) {
  return plan === 'flagship'
}

export function buildEnterpriseAccountViews(
  plan: SubscriptionPlanCode,
  sourceAccounts: CreditAccount[],
): EnterpriseAccountView[] {
  const accounts = sourceAccounts.map<EnterpriseAccountView>((account, index) => ({
    ...account,
    relation: canMotherAccountViewChildren(plan) && index === 0 ? 'mother' : 'standalone',
    displayName: account.accountScope === 'tenant'
      ? `企业账户 #${account.tenantId ?? account.id}`
      : `个人账户 #${account.id}`,
  }))

  if (!canMotherAccountViewChildren(plan) || !accounts.length) return accounts

  const motherAccount = accounts[0]
  const childAccounts = flagshipChildProfiles.map<EnterpriseAccountView>((profile, index) => ({
    id: -980000 - index,
    tenantId: motherAccount.tenantId,
    userId: motherAccount.userId ? motherAccount.userId * 10 + index + 1 : null,
    accountScope: motherAccount.accountScope,
    totalBalance: profile.totalBalance,
    lockedBalance: profile.lockedBalance,
    availableBalance: profile.availableBalance,
    currency: motherAccount.currency,
    status: motherAccount.status,
    relation: 'child',
    displayName: profile.displayName,
    parentAccountId: motherAccount.id,
    synthetic: true,
  }))

  return [
    {
      ...motherAccount,
      relation: 'mother',
      displayName: `${motherAccount.displayName} · 母账号`,
    },
    ...childAccounts,
    ...accounts.slice(1),
  ]
}

export function buildFlagshipChildTransactions(
  plan: SubscriptionPlanCode,
  accounts: EnterpriseAccountView[],
): CreditTransaction[] {
  if (!canMotherAccountViewChildren(plan)) return []

  const childAccounts = accounts.filter((account) => account.relation === 'child')
  return childAccounts.flatMap((account, index) => {
    const now = Date.now() - index * 60 * 60 * 1000
    const userId = account.userId ?? 0
    const childIndex = index + 1

    return [
      {
        id: -980100 - index * 10,
        tenantId: account.tenantId,
        userId,
        accountId: account.id,
        billingTaskId: null,
        paymentOrderId: null,
        applicationId: null,
        functionId: null,
        txnType: 'settle',
        points: '-120.0000',
        balanceBefore: String(Number(account.availableBalance) + 120),
        balanceAfter: account.availableBalance,
        bizType: 'child_batch_task',
        bizId: `flagship-child-${childIndex}-batch`,
        refTxnId: null,
        remark: `${account.displayName} 批量图组结算`,
        createdAt: new Date(now).toISOString(),
      },
      {
        id: -980200 - index * 10,
        tenantId: account.tenantId,
        userId,
        accountId: account.id,
        billingTaskId: null,
        paymentOrderId: null,
        applicationId: null,
        functionId: null,
        txnType: 'recharge',
        points: '20000.0000',
        balanceBefore: String(Math.max(0, Number(account.availableBalance) - 20000)),
        balanceAfter: String(Math.max(0, Number(account.availableBalance) - 120)),
        bizType: 'child_account_grant',
        bizId: `flagship-child-${childIndex}-grant`,
        refTxnId: null,
        remark: `${account.displayName} 子账号额度分配`,
        createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      },
    ]
  })
}

export function accountDisplayName(account: EnterpriseAccountView | undefined) {
  if (!account) return '—'
  return account.displayName
}
