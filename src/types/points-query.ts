export type PointsQueryVersion = "personal" | "member" | "admin";

export type PointsTxnType = "recharge" | "gift" | "consume" | "refund";

export type PointsBizSource =
  | "single"
  | "batch"
  | "package"
  | "purchase"
  | "fail";

export type PointsDateRange = "" | "7" | "30" | "90" | "custom";

export interface PointsQueryFilters {
  member: string;
  txnType: "" | PointsTxnType;
  dateRange: PointsDateRange;
  startDate: string;
  endDate: string;
  bizSource: "" | PointsBizSource;
}

export interface PointsFlowRecord {
  id: string;
  txnType: PointsTxnType;
  pointsChange: number;
  balanceAfter: number;
  bizSource: PointsBizSource;
  title: string;
  functionName: string;
  remark: string;
  createdAt: string;
  memberId?: string;
  memberName?: string;
  isOwner?: boolean;
  isCurrentUser?: boolean;
}

export interface PointsSummaryCard {
  key: string;
  label: string;
  value: string;
  unit: string;
  icon: string;
  tone: "blue" | "rose" | "emerald" | "amber" | "violet" | "cyan";
  note?: string;
}

export interface PointsQueryUserBadge {
  icon: string;
  text: string;
  className: string;
}

export interface PointsQueryViewConfig {
  version: PointsQueryVersion;
  icon: string;
  iconClassName: string;
  subtitle: string;
  teamLabel?: string;
  badges: PointsQueryUserBadge[];
  tableTitle: string;
  showMemberFilter: boolean;
  showCurrentMember: boolean;
  currentMemberName?: string;
  showMemberColumns: boolean;
  adminTheme: boolean;
  canRecharge: boolean;
}
