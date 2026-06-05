import type { UserRole } from '@/types/auth'

export type BackOfficeRole = Extract<UserRole, 'developer' | 'admin' | 'agent'>

export interface AccountCreationPolicy {
  role: BackOfficeRole
  label: string
  capabilities: string[]
  controlledBy: BackOfficeRole[]
  controllerText?: string
  scope: string
}

export interface AccountCreationPolicyState {
  developerAllowsAdminCreateAgentsAndUsers: boolean
  developerAllowsAgentCreateUsers: boolean
  adminAllowsAgentCreateUsers: boolean
  adminAllowsUserBecomeAgent: boolean
}

export interface EffectiveAccountCreationPolicy {
  developerCanCreateAdmins: boolean
  developerCanCreateAgents: boolean
  developerCanCreateUsers: boolean
  adminCanCreateAgents: boolean
  adminCanCreateUsers: boolean
  adminCanPromoteUserToAgent: boolean
  agentCanCreateUsers: boolean
}

export const defaultAccountCreationPolicyState: AccountCreationPolicyState = {
  developerAllowsAdminCreateAgentsAndUsers: true,
  developerAllowsAgentCreateUsers: true,
  adminAllowsAgentCreateUsers: true,
  adminAllowsUserBecomeAgent: true,
}

export function resolveAccountCreationPolicy(
  state: AccountCreationPolicyState,
): EffectiveAccountCreationPolicy {
  return {
    developerCanCreateAdmins: true,
    developerCanCreateAgents: true,
    developerCanCreateUsers: true,
    adminCanCreateAgents: state.developerAllowsAdminCreateAgentsAndUsers,
    adminCanCreateUsers: false,
    adminCanPromoteUserToAgent:
      state.developerAllowsAdminCreateAgentsAndUsers &&
      state.adminAllowsUserBecomeAgent,
    agentCanCreateUsers:
      state.developerAllowsAgentCreateUsers && state.adminAllowsAgentCreateUsers,
  }
}

export const accountCreationPolicies: AccountCreationPolicy[] = [
  {
    role: 'developer',
    label: '开发者',
    capabilities: [
      '创建 Admin / Agent / User',
      '读取全部流水与余额',
      '增减积分',
      '删除 Admin / Agent / User',
    ],
    controlledBy: [],
    scope: '全平台、全应用、全客户',
  },
  {
    role: 'admin',
    label: '公司管理员',
    capabilities: [
      '创建 Agent',
      '读取全部流水与余额',
      '代理商基础信息管理',
      '控制 User 成为 Agent',
    ],
    controlledBy: ['developer'],
    scope: '平台运营范围内的客户与代理商',
  },
  {
    role: 'agent',
    label: '代理商',
    capabilities: [
      '创建 User',
      '读取本人创建 User 的流水与余额',
    ],
    controlledBy: ['developer', 'admin'],
    controllerText: '公司管理员控制；开发者可禁用',
    scope: '本人名下客户与线索转化账号；公司管理员控制，开发者可禁用',
  },
]

export const reusableCreditsApplicationCatalog = [
  {
    code: 'used-car-platform',
    name: 'usedCarPlatform',
    status: 'integrated',
    functions: ['single_image_generate', 'batch_item_generate'],
  },
  {
    code: 'clothing_ai',
    name: 'clothing_ai',
    status: 'planned',
    functions: ['model_generate', 'try_on_generate', 'lifestyle_photo'],
  },
] as const
