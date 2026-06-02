import type { RowDataPacket } from "mysql2";

export type UserRole = "admin" | "enterprise";
export type SubscriptionPlanCode = "basic" | "team" | "flagship";

export type AuthenticatedUser = {
  id: string;
  username: string;
  phone: string | null;
  displayName: string;
  role: UserRole;
  permissions: string[];
  creditsUserId: number | null;
  creditsTenantId: number | null;
  accountScope: "personal" | "tenant";
};

export type SubscriptionSnapshot = {
  currentPlan: SubscriptionPlanCode;
  accountLimit: number;
  concurrentTaskLimit: number;
  visualConcurrentTaskLimit: number;
  batchConcurrentTaskLimit: number;
  giftPoints: number;
  expireTime: string;
};

export type AuthUserRow = RowDataPacket & {
  id: string;
  username: string;
  phone: string | null;
  password_hash: string;
  display_name: string;
  status: string;
  credits_user_id: number | null;
  credits_tenant_id: number | null;
  account_scope: "personal" | "tenant";
  role_code: UserRole | null;
  permissions_csv: string | null;
};

export type SessionUserRow = AuthUserRow & {
  session_id: string;
  expires_at: Date;
};

export type SubscriptionRow = RowDataPacket & {
  current_plan: SubscriptionPlanCode;
  account_limit: number;
  concurrent_task_limit: number;
  visual_concurrent_task_limit: number;
  batch_concurrent_task_limit: number;
  gift_points: number;
  expires_at: Date | null;
};

export type PlanSeedRow = RowDataPacket & {
  code: SubscriptionPlanCode;
  gift_points: number;
};
