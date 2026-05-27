export type CreditFlowRow = {
  flowNo: string
  flowType: string
  delta: string
  balance: string
  account: string
  createdAt: string
  remark: string
}

export const creditsTypeOptions = [
  { label: "\u5168\u90e8\u7c7b\u578b", value: "all-type" },
  { label: "\u5957\u9910\u8d60\u9001", value: "package" },
  { label: "\u5355\u56fe\u751f\u6210", value: "single" },
  { label: "\u6279\u91cf\u4e0a\u65b0\u4efb\u52a1", value: "batch" },
  { label: "\u5931\u8d25\u9000\u6b3e", value: "refund" },
]

export const creditsAccountOptions = [
  { label: "\u5168\u90e8\u8d26\u53f7", value: "all-account" },
  { label: "\u4f01\u4e1a\u56e2\u961f\u6863", value: "team" },
  { label: "\u7ecf\u5178\u767d\u68da", value: "white-studio" },
  { label: "5\u6708\u5c55\u5385\u6279\u91cf\u4e0a\u65b0", value: "batch-may" },
]

export const creditsStats = [
  { label: "\u7d2f\u8ba1\u83b7\u5f97", value: "+12,850", tone: "success" as const },
  { label: "\u7d2f\u8ba1\u6d88\u8017", value: "-8,320", tone: "warning" as const },
  { label: "\u5f53\u524d\u53ef\u7528", value: "1,250", tone: "info" as const },
  { label: "\u8fd130\u5929\u6d41\u6c34", value: "+1,280", tone: "purple" as const },
]

export const creditsFlowData: CreditFlowRow[] = [
  {
    flowNo: "20260520090001",
    flowType: "\u5957\u9910\u8d60\u9001",
    delta: "+550",
    balance: "1,250",
    account: "\u4f01\u4e1a\u56e2\u961f\u6863",
    createdAt: "2026-05-20 09:00:00",
    remark: "\u4f01\u4e1a\u56e2\u961f\u6863\u5f00\u901a",
  },
  {
    flowNo: "20260520093202",
    flowType: "\u5355\u56fe\u751f\u6210",
    delta: "-15",
    balance: "700",
    account: "\u7ecf\u5178\u767d\u68da",
    createdAt: "2026-05-20 09:32:18",
    remark: "\u751f\u6210\u5355\u56fe\u6d88\u8017",
  },
  {
    flowNo: "20260520091803",
    flowType: "\u6279\u91cf\u4e0a\u65b0\u4efb\u52a1",
    delta: "-120",
    balance: "715",
    account: "5\u6708\u5c55\u5385\u6279\u91cf\u4e0a\u65b0",
    createdAt: "2026-05-20 09:18:45",
    remark: "\u6279\u91cf\u4e0a\u65b0\u4efb\u52a1\u6d88\u8017",
  },
  {
    flowNo: "20260519200504",
    flowType: "\u5931\u8d25\u9000\u6b3e",
    delta: "+15",
    balance: "835",
    account: "\u2014",
    createdAt: "2026-05-19 20:05:12",
    remark: "\u4efb\u52a1\u5931\u8d25\u81ea\u52a8\u9000\u56de",
  },
  {
    flowNo: "20260518153005",
    flowType: "\u5957\u9910\u8d60\u9001",
    delta: "+200",
    balance: "820",
    account: "\u57fa\u7840\u5957\u9910",
    createdAt: "2026-05-18 15:30:22",
    remark: "\u57fa\u7840\u5957\u9910\u8d60\u9001",
  },
]

export const creditsPageCopy = {
  title: "\u79ef\u5206\u67e5\u8be2",
  subtitle: "\u67e5\u770b\u5957\u9910\u8d60\u9001\u3001\u4efb\u52a1\u6d88\u8017\u3001\u5931\u8d25\u9000\u6b3e\u7b49\u79ef\u5206\u6d41\u6c34\u3002",
  datePlaceholder: "\u5168\u90e8\u65f6\u95f4",
  typePlaceholder: "\u5168\u90e8\u7c7b\u578b",
  accountPlaceholder: "\u5168\u90e8\u8d26\u53f7",
  export: "\u5bfc\u51fa\u6d41\u6c34",
  pointsUnit: "\u79ef\u5206",
  tableTitle: "\u79ef\u5206\u6d41\u6c34",
  colFlowNo: "\u6d41\u6c34\u7f16\u53f7",
  colFlowType: "\u6d41\u6c34\u7c7b\u578b",
  colDelta: "\u79ef\u5206\u53d8\u52a8",
  colBalance: "\u79ef\u5206\u4f59\u989d",
  colAccount: "\u5173\u8054\u8d26\u53f7",
  colCreatedAt: "\u53d1\u751f\u65f6\u95f4",
  colRemark: "\u5907\u6ce8",
  colAction: "\u64cd\u4f5c",
  viewDetail: "\u67e5\u770b\u8be6\u60c5",
} as const
