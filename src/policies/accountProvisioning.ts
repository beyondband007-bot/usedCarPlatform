import type { UserRole } from '@/types/auth'

export type BackOfficeRole = Extract<UserRole, 'developer' | 'admin' | 'agent'>

export interface AccountCreationPolicy {
  role: BackOfficeRole
  label: string
  capabilities: string[]
  controlledBy: BackOfficeRole[]
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
    adminCanCreateUsers: state.developerAllowsAdminCreateAgentsAndUsers,
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
    capabilities: ['创建 Admin', '创建 Agent', '创建 User'],
    controlledBy: [],
    scope: '全平台、全应用、全客户',
  },
  {
    role: 'admin',
    label: '公司管理员',
    capabilities: ['创建 Agent', '创建 User', '控制 User 成为 Agent'],
    controlledBy: ['developer'],
    scope: '平台运营范围内的客户与代理商',
  },
  {
    role: 'agent',
    label: '代理商',
    capabilities: ['创建 User'],
    controlledBy: ['developer', 'admin'],
    scope: '本人名下客户与线索转化账号',
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
