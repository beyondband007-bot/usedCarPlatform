export type PointsQueryVersion = "personal" | "member" | "admin";

export type PointsTxnType = "recharge" | "gift" | "consume" | "refund";

export type PointsBizSource =
  | "single"
  | "batch"
  | "package"
  | "purchase"
  | "fail";

export type PointsDateRange = "" | "7" | "30" | "90" | "custom";

export type PointsFlowStatus = "effective" | "pending";

export interface PointsQueryFilters {
  member: string;
  txnType: "" | PointsTxnType;
  dateRange: PointsDateRange;
  startDate: string;
  endDate: string;
  bizSource: "" | PointsBizSource;
  status: "" | PointsFlowStatus;
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
  memberRole?: "owner" | "admin" | "member";
  isOwner?: boolean;
  isCurrentUser?: boolean;
  status?: PointsFlowStatus;
  validityPeriod?: string;
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

export interface PointsSubAccountOption {
  id: string;
  label: string;
  username?: string;
  creditsUserId: number;
  memberRole?: "owner" | "admin" | "member";
  isOwner?: boolean;
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
  showSubAccountScope?: boolean;
}
