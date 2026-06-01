<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed, onMounted, ref } from "vue";
import { NButton, NInput, NSelect, NTag } from "naive-ui";

import {
  getCreditsAdminOverview,
  type CreditAccount,
  type CreditTransaction,
  type CreditsFunction,
  type RechargeProduct,
} from "@/api/visual-workbench";
import { useAuthStore } from "@/stores/auth";

type ConsoleRole = "developer" | "admin" | "agent";
type TagTone = "blue" | "green" | "orange" | "red" | "cyan" | "default";

interface MetricItem {
  label: string;
  value: string;
  hint: string;
  icon?: string;
}

interface SideItem {
  title: string;
  desc: string;
  tag: string;
  tone?: TagTone;
}

interface ConsoleRow {
  cells: Array<string | number | null | undefined>;
  tone?: TagTone;
}

interface ConsolePage {
  menu: string;
  badge: string;
  title: string;
  subtitle: string;
  actions: string[];
  metrics: MetricItem[];
  tableTitle: string;
  columns: string[];
  rows: ConsoleRow[];
  sideTitle: string;
  side: SideItem[];
  note: string;
}

interface RoleProfile {
  label: string;
  account: string;
  name: string;
  meta: string;
  scope: string;
  loginText: string;
  pages: Record<string, ConsolePage>;
}

const authStore = useAuthStore();

const isLoading = ref(false);
const selectedRole = ref<ConsoleRole>("developer");
const activePageKey = ref("devOverview");
const searchKeyword = ref("");
const statusFilter = ref("all");
const lastAction = ref("等待操作");

const accounts = ref<CreditAccount[]>([]);
const functions = ref<CreditsFunction[]>([]);
const transactions = ref<CreditTransaction[]>([]);
const products = ref<RechargeProduct[]>([]);

const formatNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return "0";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(parsed);
};

const formatMoney = (value: string | number | null | undefined) => `¥ ${formatNumber(value)}`;

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).replace(/\//g, "-");
};

const signedPoints = (points: string | number | null | undefined) => {
  const parsed = Number(points ?? 0);
  if (!Number.isFinite(parsed)) return String(points ?? "-");
  return `${parsed > 0 ? "+" : ""}${formatNumber(parsed)}`;
};

const transactionTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    grant: "赠送",
    recharge: "充值",
    estimate: "预估",
    freeze: "冻结",
    settle: "结算",
    refund: "退款",
    release: "释放",
  };
  return labels[type] ?? type;
};

const accountName = (account: CreditAccount | undefined) => {
  if (!account) return "-";
  if (account.accountScope === "tenant") return `企业账户 #${account.tenantId ?? account.id}`;
  return `个人账户 #${account.userId ?? account.id}`;
};

const totalBalance = computed(() =>
  accounts.value.reduce((sum, account) => sum + Number(account.totalBalance || 0), 0),
);

const lockedBalance = computed(() =>
  accounts.value.reduce((sum, account) => sum + Number(account.lockedBalance || 0), 0),
);

const availableBalance = computed(() =>
  accounts.value.reduce((sum, account) => sum + Number(account.availableBalance || 0), 0),
);

const activeFunctionCount = computed(() =>
  functions.value.filter((item) => item.status === "active").length,
);

const enabledProductCount = computed(() =>
  products.value.filter((item) => item.enabled).length,
);

const transactionRows = computed<ConsoleRow[]>(() =>
  transactions.value.slice(0, 30).map((transaction) => ({
    cells: [
      transaction.id,
      transactionTypeLabel(transaction.txnType),
      signedPoints(transaction.points),
      transaction.accountId,
      transaction.billingTaskId ?? "-",
      transaction.bizType ?? "-",
      transaction.bizId ?? "-",
      formatDateTime(transaction.createdAt),
    ],
    tone:
      Number(transaction.points) > 0
        ? "green"
        : transaction.txnType === "refund"
          ? "cyan"
          : "red",
  })),
);

const functionRows = computed<ConsoleRow[]>(() =>
  functions.value.map((item) => ({
    cells: [
      item.code,
      item.name,
      item.chargeMode,
      formatNumber(item.defaultPoints),
      item.status,
      item.description ?? "-",
      item.status === "active" ? "查看/编辑/停用" : "查看/启用",
    ],
    tone: item.status === "active" ? "green" : "orange",
  })),
);

const accountRows = computed<ConsoleRow[]>(() =>
  accounts.value.map((account) => ({
    cells: [
      accountName(account),
      account.accountScope === "tenant" ? "tenant" : "user",
      account.status,
      formatNumber(account.availableBalance),
      formatNumber(account.lockedBalance),
      account.tenantId ?? "-",
      account.userId ?? "-",
      account.status === "active" ? "查看/受控调账" : "审计/恢复",
    ],
    tone: account.status === "active" ? "green" : "red",
  })),
);

const productRows = computed<ConsoleRow[]>(() =>
  products.value.map((product) => ({
    cells: [
      product.name,
      formatMoney(product.amount),
      formatNumber(product.points),
      formatNumber(product.bonusPoints),
      product.currency,
      product.enabled ? "enabled" : "disabled",
      product.enabled ? "查看/下架" : "查看/启用",
    ],
    tone: product.enabled ? "green" : "orange",
  })),
);

const staticRows = {
  tenants: [
    { cells: ["杭州云启汽车", "TEN-82001", "active", "华东渠道-陈牧", 42, "328,600", "¥ 58,000", "查看/编辑/禁用"], tone: "green" },
    { cells: ["南京新程出海", "TEN-82018", "active", "直营", 16, "92,140", "¥ 12,000", "查看/编辑"], tone: "green" },
    { cells: ["重庆车服联盟", "TEN-82039", "suspended", "西南渠道-罗青", 24, "0", "¥ 0", "恢复/审计"], tone: "red" },
  ] satisfies ConsoleRow[],
  agents: [
    { cells: ["华东渠道-陈牧", "AGT-3008", "approved", "12%", "18", "¥ 4,628", "2026-05 待确认", "查看/调整"], tone: "green" },
    { cells: ["西南渠道-罗青", "AGT-3011", "approved", "10%", "9", "¥ 1,840", "资料待补", "查看/提醒"], tone: "orange" },
    { cells: ["华南渠道-周岚", "AGT-3018", "pending", "8%", "0", "¥ 0", "待审核", "审核"], tone: "orange" },
  ] satisfies ConsoleRow[],
  leads: [
    { cells: ["上海云车出海", "林总 186****4219", "线下展会", "需求确认", "¥ 30,000", "剩余 24 天", "编辑"], tone: "orange" },
    { cells: ["无锡智驾联盟", "冯经理 139****0108", "邀请链接", "方案报价", "¥ 12,000", "剩余 17 天", "更新"], tone: "blue" },
    { cells: ["嘉兴二手车商会", "陆会长 137****7230", "转介绍", "归属冲突", "¥ 50,000", "暂停保护", "申诉"], tone: "red" },
  ] satisfies ConsoleRow[],
  customerDynamics: [
    { cells: ["杭州云启汽车", "赵敏 138****2190", "正式客户", "¥ 58,000", "92,600", "图片生成 14 积分", "查看"], tone: "green" },
    { cells: ["宁波车联智选", "吴晨 139****6618", "正式客户", "¥ 20,000", "41,800", "充值到账 ¥5,000", "查看"], tone: "green" },
    { cells: ["苏州跨境车贸", "韩雪 137****8022", "试用", "¥ 1,000", "4,020", "提交开通申请", "跟进"], tone: "orange" },
  ] satisfies ConsoleRow[],
  commissions: [
    { cells: ["2026-05-29 15:21", "杭州云启汽车", "TXN-773981", "14", "12%", "¥ 0.17", "待结算"], tone: "orange" },
    { cells: ["2026-05-28 19:04", "宁波车联智选", "TXN-771220", "280", "12%", "¥ 3.36", "待结算"], tone: "orange" },
    { cells: ["2026-05-05 10:00", "月度结算", "SETTLE-202605", "152,000", "12%", "¥ 18,240", "已结算"], tone: "green" },
  ] satisfies ConsoleRow[],
  settlements: [
    { cells: ["2026-05", "76,900", "¥ 4,628", "¥ 32", "¥ 4,596", "待确认", "确认/申诉"], tone: "orange" },
    { cells: ["2026-04", "152,000", "¥ 18,240", "¥ 0", "¥ 18,240", "已打款", "下载"], tone: "green" },
    { cells: ["2026-03", "98,600", "¥ 11,832", "¥ 120", "¥ 11,712", "已打款", "下载"], tone: "green" },
  ] satisfies ConsoleRow[],
  materials: [
    { cells: ["积分中台销售手册", "PDF", "首次拜访", "v1.2", "2026-05-22", "代理可见", "下载"], tone: "blue" },
    { cells: ["汽车电商案例包", "PPT", "方案演示", "v0.9", "2026-05-25", "代理可见", "下载"], tone: "blue" },
    { cells: ["价格与返佣政策", "文档", "报价阶段", "v1.0", "2026-05-20", "需登录", "查看"], tone: "cyan" },
  ] satisfies ConsoleRow[],
  tickets: [
    { cells: ["TCK-9012", "归属争议", "嘉兴二手车商会", "高", "处理中", "渠道运营-周岚", "2026-05-29 16:10"], tone: "red" },
    { cells: ["TCK-9008", "返佣疑问", "2026-05 账单", "中", "待回复", "财务-许宁", "2026-05-29 11:30"], tone: "orange" },
    { cells: ["TCK-8991", "技术支持", "回调配置", "普通", "已解决", "技术支持-沈知", "2026-05-28 18:20"], tone: "blue" },
  ] satisfies ConsoleRow[],
};

const sideItems = {
  dev: [
    { title: "回调异常", desc: "2 个支付回调验签失败。", tag: "排查", tone: "red" },
    { title: "对账差异", desc: "2026-05-28 存在 4 条差异。", tag: "高", tone: "orange" },
    { title: "密钥轮换", desc: "3 个应用超过 90 天未轮换。", tag: "安全", tone: "cyan" },
  ] satisfies SideItem[],
  ops: [
    { title: "代理审核", desc: "2 个代理商申请待审批。", tag: "审批", tone: "orange" },
    { title: "补偿到账", desc: "1 笔已支付订单未生成 grant。", tag: "财务", tone: "red" },
    { title: "客户归属", desc: "嘉兴二手车商会触发渠道冲突。", tag: "争议", tone: "cyan" },
  ] satisfies SideItem[],
  agent: [
    { title: "客户跟进", desc: "3 个报备商机 7 天未更新。", tag: "待办", tone: "orange" },
    { title: "结算确认", desc: "5 月返佣账单待确认。", tag: "财务", tone: "cyan" },
    { title: "资料完善", desc: "结算账户资质将在 30 天后过期。", tag: "提醒", tone: "blue" },
  ] satisfies SideItem[],
};

const agentPages = computed<Record<string, ConsolePage>>(() => ({
  agentOverview: {
    menu: "代理工作台",
    badge: "看自己",
    title: "代理工作台",
    subtitle: "汇总名下客户、报备商机、消费、返佣和结算状态。",
    metrics: [
      { label: "名下客户", value: "18", hint: "本月新增 4 个", icon: "mdi:account-group-outline" },
      { label: "报备商机", value: "27", hint: "8 个推进中", icon: "mdi:clipboard-text-search" },
      { label: "待结算返佣", value: "¥ 4,628", hint: "预计 2026-06-05", icon: "mdi:cash-clock" },
      { label: "本月客户消费", value: "76,900", hint: "积分", icon: "mdi:chart-line" },
    ],
    actions: ["报备商机", "新增客户", "复制邀请链接"],
    tableTitle: "近期客户动态",
    columns: ["客户", "联系人", "阶段", "累计充值", "累计消费", "最近动作", "操作"],
    rows: staticRows.customerDynamics,
    sideTitle: "代理待办",
    side: sideItems.agent,
    note: "代理商只能看自己名下客户和返佣，不能看平台全局流水。",
  },
  leads: {
    menu: "线索/报备",
    badge: "新增",
    title: "线索与商机报备",
    subtitle: "代理商先报备商机，管理员或开发者可审核归属冲突。",
    metrics: [
      { label: "已报备", value: "27", hint: "累计", icon: "mdi:folder-account" },
      { label: "推进中", value: "8", hint: "本月", icon: "mdi:progress-clock" },
      { label: "冲突审核", value: "2", hint: "归属待判定", icon: "mdi:alert-circle-outline" },
      { label: "转正式客户", value: "5", hint: "本月", icon: "mdi:account-check-outline" },
    ],
    actions: ["新建报备", "导入线索", "下载报备模板"],
    tableTitle: "商机报备列表",
    columns: ["商机名称", "联系人", "来源", "阶段", "预计充值", "保护期", "操作"],
    rows: staticRows.leads,
    sideTitle: "报备规则",
    side: [
      { title: "保护期", desc: "默认 30 天，管理员可延期。", tag: "规则" },
      { title: "冲突处理", desc: "同一手机号/企业名触发归属审核。", tag: "审核", tone: "orange" },
      { title: "转化条件", desc: "首笔充值到账后转正式客户。", tag: "自动", tone: "green" },
    ],
    note: "线索模块补足代理商系统常见的商机保护和渠道冲突管理。",
  },
  agentCustomers: {
    menu: "我的客户",
    badge: "范围",
    title: "我的客户",
    subtitle: "代理商只能维护自己的客户资料和跟进状态，不能直接改积分余额。",
    metrics: [
      { label: "正式客户", value: "18", hint: "active", icon: "mdi:domain" },
      { label: "试用客户", value: "6", hint: "trial", icon: "mdi:account-clock" },
      { label: "沉默客户", value: "3", hint: "14 天无消费", icon: "mdi:sleep" },
      { label: "本月新增", value: "4", hint: "客户", icon: "mdi:account-plus" },
    ],
    actions: ["新增客户", "批量导入", "导出客户"],
    tableTitle: "客户列表",
    columns: ["客户名称", "联系人", "状态", "绑定方式", "累计充值", "累计消费", "操作"],
    rows: staticRows.customerDynamics.map((row) => ({
      ...row,
      cells: [row.cells[0], row.cells[1], row.cells[2], "邀请/后台绑定", row.cells[3], row.cells[4], row.cells[6]],
    })),
    sideTitle: "客户健康",
    side: [
      { title: "高价值", desc: "2 个客户本月消费超过 30,000 积分。", tag: "重点", tone: "green" },
      { title: "需唤醒", desc: "3 个客户 14 天无调用。", tag: "提醒", tone: "orange" },
      { title: "资料缺失", desc: "4 个客户未补营业信息。", tag: "补齐", tone: "blue" },
    ],
    note: "代理商可新增和编辑客户基础资料，但客户归属和积分账户变更需要管理员审核。",
  },
  consumption: {
    menu: "客户消费",
    badge: "只读",
    title: "客户消费记录",
    subtitle: "展示名下客户的积分消耗、充值和任务扣费，用于代理商跟进续费。",
    metrics: [
      { label: "本月消费", value: "76,900", hint: "积分", icon: "mdi:chart-bar" },
      { label: "充值订单", value: "12", hint: "笔", icon: "mdi:receipt-text" },
      { label: "高频客户", value: "5", hint: "客户", icon: "mdi:fire" },
      { label: "异常退款", value: "3", hint: "笔", icon: "mdi:undo-variant" },
    ],
    actions: ["导出消费", "设置续费提醒"],
    tableTitle: "客户消费流水",
    columns: ["时间", "客户", "类型", "业务ID", "积分变化", "余额", "返佣状态"],
    rows: transactionRows.value.length
      ? transactionRows.value.slice(0, 8).map((row) => ({
          ...row,
          cells: [row.cells[7], "杭州云启汽车", row.cells[1], row.cells[6], row.cells[2], "实时", "已计佣"],
        }))
      : staticRows.customerDynamics,
    sideTitle: "续费提醒",
    side: [
      { title: "余额预警", desc: "杭州云启汽车低于 50,000 后提醒。", tag: "已设", tone: "blue" },
      { title: "活跃下降", desc: "宁波车联近 3 日调用下降 42%。", tag: "关注", tone: "orange" },
      { title: "异常退款", desc: "苏州跨境车贸 24h 内退款 3 次。", tag: "排查", tone: "red" },
    ],
    note: "消费记录代理商只能查看和导出，不能调整积分。",
  },
  commission: {
    menu: "返佣记录",
    badge: "财务",
    title: "返佣记录",
    subtitle: "按客户消费流水生成返佣，支持待结算、已结算、冲回和无效状态。",
    metrics: [
      { label: "待结算", value: "¥ 4,628", hint: "本月", icon: "mdi:cash-clock" },
      { label: "已结算", value: "¥ 18,240", hint: "最近一次", icon: "mdi:cash-check" },
      { label: "冲回金额", value: "¥ 32", hint: "退款导致", icon: "mdi:cash-refund" },
      { label: "返佣比例", value: "12%", hint: "当前等级", icon: "mdi:percent-outline" },
    ],
    actions: ["导出返佣", "发起结算确认"],
    tableTitle: "返佣流水",
    columns: ["时间", "客户", "关联流水", "消费积分", "比例", "返佣金额", "状态"],
    rows: staticRows.commissions,
    sideTitle: "返佣规则",
    side: [
      { title: "计佣口径", desc: "按客户实际消耗积分，不按充值额。", tag: "规则", tone: "cyan" },
      { title: "冲回", desc: "退款和人工调账会冲回返佣。", tag: "规则", tone: "orange" },
      { title: "结算周期", desc: "每月 5 日结算上月账单。", tag: "周期", tone: "blue" },
    ],
    note: "返佣记录应保留不可变流水，结算单另建状态。",
  },
  settlement: {
    menu: "结算账单",
    badge: "确认",
    title: "结算账单",
    subtitle: "代理商查看账单、确认结算资料、下载对账单和发起疑问。",
    metrics: [
      { label: "待确认账单", value: "1", hint: "2026-05", icon: "mdi:file-clock-outline" },
      { label: "已打款", value: "5", hint: "历史", icon: "mdi:bank-transfer-out" },
      { label: "待补资料", value: "0", hint: "当前", icon: "mdi:file-check-outline" },
      { label: "账单争议", value: "1", hint: "处理中", icon: "mdi:comment-alert-outline" },
    ],
    actions: ["确认账单", "下载账单", "提交疑问"],
    tableTitle: "结算单",
    columns: ["账期", "消费积分", "返佣金额", "扣减", "应结算", "状态", "操作"],
    rows: staticRows.settlements,
    sideTitle: "结算资料",
    side: [
      { title: "收款账户", desc: "招商银行 尾号 8221 陈牧。", tag: "已验证", tone: "green" },
      { title: "发票要求", desc: "服务费发票，税率 6%。", tag: "已配置", tone: "blue" },
      { title: "资料有效期", desc: "营业执照有效期至 2028-12-31。", tag: "正常", tone: "green" },
    ],
    note: "MVP 可先做确认和下载，不做自动打款。",
  },
  materials: {
    menu: "物料/培训",
    badge: "支持",
    title: "营销物料与培训",
    subtitle: "代理商经营后台的统一话术、报价材料、培训认证和版本通知。",
    metrics: [
      { label: "可用物料", value: "24", hint: "份", icon: "mdi:file-document-multiple" },
      { label: "培训课程", value: "6", hint: "节", icon: "mdi:school-outline" },
      { label: "已认证人员", value: "3", hint: "人", icon: "mdi:certificate-outline" },
      { label: "最新公告", value: "2", hint: "条", icon: "mdi:bullhorn-outline" },
    ],
    actions: ["下载物料包", "报名培训", "提交案例"],
    tableTitle: "物料列表",
    columns: ["名称", "类型", "适用场景", "版本", "更新时间", "权限", "操作"],
    rows: staticRows.materials,
    sideTitle: "培训认证",
    side: [
      { title: "产品入门", desc: "已完成，分数 92。", tag: "通过", tone: "green" },
      { title: "渠道合规", desc: "未完成，建议本周完成。", tag: "待学", tone: "orange" },
      { title: "案例共创", desc: "提交客户案例可提升代理等级。", tag: "激励", tone: "cyan" },
    ],
    note: "这不是积分核心，但对代理商经营后台很关键。",
  },
  tickets: {
    menu: "工单支持",
    badge: "服务",
    title: "工单支持",
    subtitle: "代理商提交客户问题、归属争议、返佣疑问和技术支持请求。",
    metrics: [
      { label: "开放工单", value: "5", hint: "当前", icon: "mdi:ticket-outline" },
      { label: "超时工单", value: "1", hint: "需处理", icon: "mdi:timer-alert-outline" },
      { label: "本月已解决", value: "18", hint: "单", icon: "mdi:check-decagram-outline" },
      { label: "平均响应", value: "2.4h", hint: "工作时段", icon: "mdi:clock-fast" },
    ],
    actions: ["新建工单", "上传附件"],
    tableTitle: "工单列表",
    columns: ["工单号", "类型", "客户/对象", "优先级", "状态", "负责人", "更新时间"],
    rows: staticRows.tickets,
    sideTitle: "SLA",
    side: [
      { title: "高优先级", desc: "4 小时内响应。", tag: "SLA", tone: "red" },
      { title: "普通工单", desc: "1 个工作日内响应。", tag: "SLA", tone: "blue" },
      { title: "归属争议", desc: "需提供客户授权或沟通记录。", tag: "材料", tone: "orange" },
    ],
    note: "工单可以贯穿代理商、管理员、开发者三端。",
  },
}));

const roleProfiles = computed<Record<ConsoleRole, RoleProfile>>(() => ({
  developer: {
    label: "开发者后台",
    loginText: "开发者",
    account: "dev@jingchuang.ai",
    name: "沈知 · 平台开发者",
    meta: "developerId: DEV-ROOT · full_access · CRUD 全量权限",
    scope: "拥有系统级功能、配置能力和主要数据维护权限。",
    pages: {
      devOverview: {
        menu: "系统总览",
        badge: "全局",
        title: "系统总览",
        subtitle: "开发者视角拥有所有功能，并可进入核心数据维护、配置和审计页面。",
        metrics: [
          { label: "租户/客户", value: String(accounts.value.length || 128), hint: "live accounts / demo tenants", icon: "mdi:domain" },
          { label: "平台积分余额", value: formatNumber(totalBalance.value), hint: `冻结 ${formatNumber(lockedBalance.value)}`, icon: "mdi:wallet-outline" },
          { label: "启用能力", value: String(activeFunctionCount.value), hint: "usedCarPlatform functions", icon: "mdi:function-variant" },
          { label: "充值产品", value: String(enabledProductCount.value), hint: "enabled products", icon: "mdi:cart-outline" },
        ],
        actions: ["新建租户", "新建应用", "手动对账", "导出审计"],
        tableTitle: "系统核心对象",
        columns: ["对象", "数量", "可新增", "可编辑", "可删除", "风险等级", "入口"],
        rows: [
          { cells: ["租户/客户", accounts.value.length || 128, "是", "是", "软删除", "中", "进入"], tone: "orange" },
          { cells: ["积分账户", accounts.value.length, "是", "受控", "否", "高", "进入"], tone: "red" },
          { cells: ["充值产品", products.value.length, "是", "是", "下架", "中", "进入"], tone: "orange" },
          { cells: ["代理商", 42, "是", "是", "暂停", "中", "进入"], tone: "orange" },
        ],
        sideTitle: "开发待办",
        side: sideItems.dev,
        note: "开发者是最高权限账号，但资金类删除应采用软删除/禁用/冲正，不做物理删除。",
      },
      apps: {
        menu: "应用/API 管理",
        badge: "CRUD",
        title: "应用/API 管理",
        subtitle: "管理接入应用、功能计费、API Key、回调地址和 IP 白名单。",
        metrics: [
          { label: "接入应用", value: "1", hint: "used-car-platform", icon: "mdi:application-braces-outline" },
          { label: "启用能力", value: String(activeFunctionCount.value), hint: "计费项", icon: "mdi:function-variant" },
          { label: "API Key", value: "待接入", hint: "后续接 Reusable Credits", icon: "mdi:key-outline" },
          { label: "回调成功率", value: "99.18%", hint: "demo", icon: "mdi:chart-line" },
        ],
        actions: ["新建应用", "编辑能力", "重置密钥", "配置白名单"],
        tableTitle: "usedCarPlatform 功能列表",
        columns: ["功能代码", "名称", "计费模式", "默认积分", "状态", "描述", "操作"],
        rows: functionRows.value,
        sideTitle: "接入规则",
        side: [
          { title: "幂等", desc: "资金类接口必须带 Idempotency-Key。", tag: "必填", tone: "red" },
          { title: "回调", desc: "支付和任务结算回调需验签。", tag: "安全", tone: "orange" },
          { title: "限流", desc: "默认 600 rpm，可按应用调整。", tag: "配置", tone: "cyan" },
        ],
        note: "功能定价来自 Reusable Credits Platform live integration API。",
      },
      dataCrud: {
        menu: "数据 CRUD",
        badge: "核心",
        title: "核心数据 CRUD",
        subtitle: "对租户、用户、账户、产品、订单、代理商做受控维护。",
        metrics: [
          { label: "可维护表", value: "14", hint: "核心", icon: "mdi:database-cog-outline" },
          { label: "受控写操作", value: "8", hint: "需原因", icon: "mdi:shield-edit-outline" },
          { label: "高危操作", value: "5", hint: "需二次确认", icon: "mdi:alert-outline" },
          { label: "审计覆盖", value: "100%", hint: "operatorId", icon: "mdi:file-search-outline" },
        ],
        actions: ["新增记录", "批量编辑", "软删除", "查看变更日志"],
        tableTitle: "数据表权限",
        columns: ["数据对象", "新增", "读取", "编辑", "删除/禁用", "审计字段", "说明"],
        rows: [
          { cells: ["tenants", "允许", "允许", "允许", "软删除", "operatorId/reason", "客户组织"], tone: "blue" },
          { cells: ["users", "允许", "允许", "允许", "禁用", "before/after", "登录身份"], tone: "blue" },
          { cells: ["credit_accounts", "受控", "允许", "调账", "禁止", "reason/balance", "积分账户"], tone: "red" },
          { cells: ["credit_transactions", "禁止", "允许", "禁止", "禁止", "immutable", "不可变流水"], tone: "red" },
          { cells: ["recharge_products", "允许", "允许", "允许", "下架", "version", "充值档位"], tone: "orange" },
        ],
        sideTitle: "高危写入",
        side: [
          { title: "手动调账", desc: "必须填写原因和附件。", tag: "二次确认", tone: "red" },
          { title: "产品下架", desc: "不影响历史订单。", tag: "规则", tone: "orange" },
          { title: "用户禁用", desc: "保留历史流水和审计。", tag: "合规", tone: "cyan" },
        ],
        note: "这里是后台字段权限蓝图；资金写操作后续需要真实审批接口。",
      },
      tenants: {
        menu: "租户/客户",
        badge: "CRUD",
        title: "租户与客户管理",
        subtitle: "开发者可创建、编辑、禁用客户，并管理代理商归属和账户策略。",
        metrics: [
          { label: "客户数", value: "128", hint: "active 113", icon: "mdi:office-building" },
          { label: "账户数", value: String(accounts.value.length), hint: "live credit accounts", icon: "mdi:account-credit-card-outline" },
          { label: "代理归属", value: "42", hint: "客户", icon: "mdi:account-tie" },
          { label: "异常客户", value: "6", hint: "需处理", icon: "mdi:alert-circle-outline" },
        ],
        actions: ["新建客户", "编辑归属", "禁用客户", "导入客户"],
        tableTitle: "客户列表",
        columns: ["客户", "tenantId", "状态", "代理商", "成员数", "可用积分", "累计充值", "操作"],
        rows: staticRows.tenants,
        sideTitle: "客户策略",
        side: [
          { title: "归属变更", desc: "会影响未来返佣，不重算历史。", tag: "规则", tone: "cyan" },
          { title: "禁用客户", desc: "禁止新任务，保留查询。", tag: "安全", tone: "orange" },
          { title: "充值档位", desc: "可绑定企业专属档位。", tag: "配置", tone: "blue" },
        ],
        note: "公司管理员也能看此模块，但不能删除或改核心账户策略。",
      },
      accounts: {
        menu: "用户/账户",
        badge: "资金",
        title: "用户与积分账户",
        subtitle: "查询登录用户、租户成员和积分账户，支持受控调账和锁定排查。",
        metrics: [
          { label: "积分账户", value: String(accounts.value.length), hint: "live", icon: "mdi:wallet-outline" },
          { label: "可用积分", value: formatNumber(availableBalance.value), hint: "live total", icon: "mdi:diamond-stone" },
          { label: "冻结积分", value: formatNumber(lockedBalance.value), hint: "任务中", icon: "mdi:lock-clock" },
          { label: "锁定账户", value: "0", hint: "demo", icon: "mdi:account-lock-outline" },
        ],
        actions: ["新建用户", "禁用用户", "手动调账", "解锁账户"],
        tableTitle: "账户列表",
        columns: ["主体", "账户类型", "状态", "可用积分", "冻结积分", "租户ID", "用户ID", "操作"],
        rows: accountRows.value,
        sideTitle: "账户安全",
        side: [
          { title: "调账", desc: "必须生成 adjustment 流水。", tag: "强审计", tone: "red" },
          { title: "冻结", desc: "任务冻结 30 分钟超时退款。", tag: "规则", tone: "orange" },
          { title: "锁定", desc: "登录失败 5 次锁定 15 分钟。", tag: "安全", tone: "cyan" },
        ],
        note: "资金相关只能追加流水或冲正，不能直接改历史流水。",
      },
      payments: {
        menu: "充值/支付",
        badge: "财务",
        title: "充值订单与支付",
        subtitle: "管理充值档位、订单、支付回调和到账状态。",
        metrics: [
          { label: "充值产品", value: String(products.value.length), hint: `启用 ${enabledProductCount.value}`, icon: "mdi:cart-outline" },
          { label: "待到账", value: "3", hint: "已支付未 grant", icon: "mdi:cash-clock" },
          { label: "回调失败", value: "2", hint: "验签/超时", icon: "mdi:alert-decagram-outline" },
          { label: "本月充值", value: "¥ 326,800", hint: "demo", icon: "mdi:chart-areaspline" },
        ],
        actions: ["新建充值产品", "编辑档位", "补偿到账", "导出订单"],
        tableTitle: "充值产品",
        columns: ["产品", "金额", "积分", "赠送积分", "币种", "状态", "操作"],
        rows: productRows.value,
        sideTitle: "支付约束",
        side: [
          { title: "下单", desc: "前端只传 productId。", tag: "安全", tone: "red" },
          { title: "到账", desc: "callback_verified_at 到 grant <= 3s。", tag: "SLA", tone: "orange" },
          { title: "补偿", desc: "需 idempotencyKey 和原因。", tag: "审计", tone: "cyan" },
        ],
        note: "开发者可维护产品档位；管理员通常只可查看订单、导出和发起补偿申请。",
      },
      transactions: {
        menu: "流水审计",
        badge: "只读",
        title: "积分流水审计",
        subtitle: "展示估算、冻结、结算、退款、充值等不可变流水。",
        metrics: [
          { label: "流水条数", value: String(transactions.value.length), hint: "latest", icon: "mdi:format-list-bulleted" },
          { label: "冻结流水", value: String(transactions.value.filter((item) => item.txnType === "freeze").length), hint: "latest", icon: "mdi:lock-clock" },
          { label: "结算流水", value: String(transactions.value.filter((item) => item.txnType === "settle").length), hint: "latest", icon: "mdi:check-decagram" },
          { label: "退款流水", value: String(transactions.value.filter((item) => item.txnType === "refund").length), hint: "latest", icon: "mdi:cash-refund" },
        ],
        actions: ["导出流水", "查看关联任务", "审计检索"],
        tableTitle: "最近积分流水",
        columns: ["流水ID", "类型", "积分", "账户ID", "计费任务", "业务类型", "业务ID", "时间"],
        rows: transactionRows.value,
        sideTitle: "审计原则",
        side: [
          { title: "不可变", desc: "流水只追加，不覆盖。", tag: "账本", tone: "red" },
          { title: "幂等键", desc: "业务重复提交应返回 replay。", tag: "幂等", tone: "cyan" },
          { title: "关联业务", desc: "bizType/bizId 回查 usedCar 任务。", tag: "追踪", tone: "blue" },
        ],
        note: "流水页使用 live Reusable Credits Platform transactions。",
      },
      agents: {
        menu: "代理商",
        badge: "渠道",
        title: "代理商管理",
        subtitle: "维护代理商准入、等级、返佣比例、结算资料和客户归属。",
        metrics: [
          { label: "代理商", value: "42", hint: "approved 37", icon: "mdi:account-tie" },
          { label: "待审核", value: "2", hint: "资料审核", icon: "mdi:account-clock" },
          { label: "本月返佣", value: "¥ 46,200", hint: "demo", icon: "mdi:cash-multiple" },
          { label: "归属争议", value: "4", hint: "需判定", icon: "mdi:source-branch" },
        ],
        actions: ["新增代理", "审核代理", "调整等级", "导出结算"],
        tableTitle: "代理商列表",
        columns: ["代理商", "agentId", "状态", "返佣比例", "客户数", "待结算", "结算状态", "操作"],
        rows: staticRows.agents,
        sideTitle: "渠道规则",
        side: [
          { title: "准入", desc: "营业资料和结算账户需审核。", tag: "审核", tone: "orange" },
          { title: "比例", desc: "等级控制默认返佣比例。", tag: "配置", tone: "cyan" },
          { title: "争议", desc: "同客户归属冲突进入工单。", tag: "工单", tone: "red" },
        ],
        note: "代理商模块目前为经营后台 mock 数据，后续需要 agent APIs 落库。",
      },
    },
  },
  admin: {
    label: "公司管理员后台",
    loginText: "公司管理员",
    account: "admin@jingchuang.ai",
    name: authStore.userName || "运营管理员",
    meta: "opsId: OPS-1009 · company_admin · 运营/渠道/财务视图",
    scope: "拥有代理商功能、客户查看、订单导出和部分维护权限。",
    pages: {
      adminOverview: {
        menu: "运营总览",
        badge: "Ops",
        title: "运营总览",
        subtitle: "公司管理员查看代理、客户、充值、消费和待办，不直接改系统核心配置。",
        metrics: [
          { label: "客户账户", value: String(accounts.value.length), hint: "live accounts", icon: "mdi:wallet-outline" },
          { label: "充值产品", value: String(enabledProductCount.value), hint: "enabled", icon: "mdi:cart-outline" },
          { label: "代理待办", value: "7", hint: "审核/争议/结算", icon: "mdi:clipboard-alert-outline" },
          { label: "最近流水", value: String(transactions.value.length), hint: "live transactions", icon: "mdi:format-list-bulleted" },
        ],
        actions: ["审核代理", "导出客户", "发起补偿申请"],
        tableTitle: "运营待办",
        columns: ["事项", "对象", "优先级", "状态", "负责人", "更新时间", "操作"],
        rows: [
          { cells: ["代理审核", "华南渠道-周岚", "中", "待审核", "渠道运营", "2026-05-29 16:00", "处理"], tone: "orange" },
          { cells: ["归属争议", "嘉兴二手车商会", "高", "处理中", "周岚", "2026-05-29 15:40", "查看"], tone: "red" },
          { cells: ["补偿到账", "PAY-20260529-0092", "高", "待确认", "财务", "2026-05-29 14:22", "申请"], tone: "red" },
        ],
        sideTitle: "管理员边界",
        side: sideItems.ops,
        note: "公司管理员可以处理运营动作，但不能删除不可变流水或绕过资金审计。",
      },
      agentsView: {
        menu: "代理商管理",
        badge: "查看",
        title: "代理商管理",
        subtitle: "管理员可查看、审核和维护代理商基础信息，返佣比例调整需审计。",
        metrics: [
          { label: "代理商", value: "42", hint: "approved 37", icon: "mdi:account-tie" },
          { label: "待审核", value: "2", hint: "资料审核", icon: "mdi:account-clock" },
          { label: "资料过期", value: "3", hint: "30 天内", icon: "mdi:file-alert-outline" },
          { label: "争议工单", value: "4", hint: "处理中", icon: "mdi:ticket-outline" },
        ],
        actions: ["审核代理", "提醒补资料", "导出代理"],
        tableTitle: "代理商列表",
        columns: ["代理商", "agentId", "状态", "返佣比例", "客户数", "待结算", "结算状态", "操作"],
        rows: staticRows.agents,
        sideTitle: "审核材料",
        side: [
          { title: "营业执照", desc: "需验证统一社会信用代码。", tag: "必填", tone: "red" },
          { title: "收款账户", desc: "需与主体信息匹配。", tag: "财务", tone: "orange" },
          { title: "渠道协议", desc: "按区域和等级配置返佣。", tag: "合同", tone: "cyan" },
        ],
        note: "管理员拥有代理商功能，但开发者保留系统参数和接口配置权限。",
      },
      tenantsLimited: {
        menu: "客户管理",
        badge: "部分",
        title: "客户管理",
        subtitle: "管理员查看客户、归属和账户健康，可维护资料但不可直接改积分余额。",
        metrics: [
          { label: "客户数", value: "128", hint: "active 113", icon: "mdi:office-building" },
          { label: "异常客户", value: "6", hint: "需处理", icon: "mdi:alert-circle-outline" },
          { label: "归属代理", value: "42", hint: "客户", icon: "mdi:account-tie" },
          { label: "账户余额", value: formatNumber(availableBalance.value), hint: "live total", icon: "mdi:wallet-outline" },
        ],
        actions: ["编辑资料", "调整跟进人", "导出客户"],
        tableTitle: "客户列表",
        columns: ["客户", "tenantId", "状态", "代理商", "成员数", "可用积分", "累计充值", "操作"],
        rows: staticRows.tenants,
        sideTitle: "客户策略",
        side: [
          { title: "归属变更", desc: "会影响未来返佣，不重算历史。", tag: "规则", tone: "cyan" },
          { title: "资料维护", desc: "允许改联系人和业务标签。", tag: "允许", tone: "green" },
          { title: "积分调账", desc: "只能发起申请，不能直接执行。", tag: "受控", tone: "red" },
        ],
        note: "管理员客户页是受限版本，不展示开发者的高危 CRUD。",
      },
      paymentsView: {
        menu: "充值订单",
        badge: "财务",
        title: "充值订单与产品",
        subtitle: "管理员查看充值产品和订单，补偿到账需要走申请流程。",
        metrics: [
          { label: "充值产品", value: String(products.value.length), hint: `启用 ${enabledProductCount.value}`, icon: "mdi:cart-outline" },
          { label: "待到账", value: "3", hint: "demo", icon: "mdi:cash-clock" },
          { label: "回调失败", value: "2", hint: "demo", icon: "mdi:alert-decagram-outline" },
          { label: "本月充值", value: "¥ 326,800", hint: "demo", icon: "mdi:chart-line" },
        ],
        actions: ["导出订单", "发起补偿申请", "查看产品"],
        tableTitle: "充值产品",
        columns: ["产品", "金额", "积分", "赠送积分", "币种", "状态", "操作"],
        rows: productRows.value,
        sideTitle: "财务待办",
        side: [
          { title: "未到账订单", desc: "3 笔需要核对回调。", tag: "高", tone: "red" },
          { title: "产品变更", desc: "产品价格变更需开发者发布。", tag: "规则", tone: "orange" },
          { title: "导出", desc: "财务导出自动记录 operatorId。", tag: "审计", tone: "cyan" },
        ],
        note: "管理员可以查看和申请补偿，产品 CRUD 留给开发者。",
      },
      transactionsView: {
        menu: "积分流水",
        badge: "只读",
        title: "积分流水",
        subtitle: "运营视角查看近期积分变动和关联业务，支持导出审计。",
        metrics: [
          { label: "流水条数", value: String(transactions.value.length), hint: "latest", icon: "mdi:format-list-bulleted" },
          { label: "结算流水", value: String(transactions.value.filter((item) => item.txnType === "settle").length), hint: "latest", icon: "mdi:check-decagram" },
          { label: "退款流水", value: String(transactions.value.filter((item) => item.txnType === "refund").length), hint: "latest", icon: "mdi:cash-refund" },
          { label: "冻结积分", value: formatNumber(lockedBalance.value), hint: "live", icon: "mdi:lock-clock" },
        ],
        actions: ["导出流水", "查看任务", "创建工单"],
        tableTitle: "最近积分流水",
        columns: ["流水ID", "类型", "积分", "账户ID", "计费任务", "业务类型", "业务ID", "时间"],
        rows: transactionRows.value,
        sideTitle: "运营约束",
        side: [
          { title: "只读", desc: "运营不能编辑流水。", tag: "账本", tone: "red" },
          { title: "问题处理", desc: "异常通过工单和补偿申请处理。", tag: "流程", tone: "orange" },
          { title: "导出", desc: "导出记录进入审计日志。", tag: "审计", tone: "cyan" },
        ],
        note: "流水数据来自 usedCar proxy 的 live transactions。",
      },
      tickets: agentPages.value.tickets,
    },
  },
  agent: {
    label: "代理商后台",
    loginText: "代理商",
    account: "agent@channel.cn",
    name: "陈牧 · 华东渠道代理",
    meta: "agentId: AGT-3008 · approved · rebate 12%",
    scope: "只能管理自己的客户、商机、消费、返佣与结算。",
    pages: agentPages.value,
  },
}));

const roleOptions = computed(() =>
  (Object.entries(roleProfiles.value) as Array<[ConsoleRole, RoleProfile]>).map(([value, role]) => ({
    label: role.loginText,
    value,
  })),
);

const activeRole = computed(() => roleProfiles.value[selectedRole.value]);
const pageEntries = computed(() => Object.entries(activeRole.value.pages));
const activePage = computed(() => activeRole.value.pages[activePageKey.value] ?? pageEntries.value[0]?.[1]);

const statusOptions = [
  { label: "全部状态", value: "all" },
  { label: "正常/启用", value: "green" },
  { label: "待处理", value: "orange" },
  { label: "异常/高危", value: "red" },
  { label: "信息/只读", value: "blue" },
];

const filteredRows = computed(() => {
  const page = activePage.value;
  if (!page) return [];
  const keyword = searchKeyword.value.trim().toLowerCase();
  return page.rows.filter((row) => {
    const rowText = row.cells.join(" ").toLowerCase();
    const statusMatched = statusFilter.value === "all" || row.tone === statusFilter.value;
    const keywordMatched = !keyword || rowText.includes(keyword);
    return statusMatched && keywordMatched;
  });
});

const tagColumnNames = new Set(["状态", "阶段", "保护期", "权限", "优先级", "结算状态", "返佣状态"]);

function isTagCell(cellIndex: number) {
  return tagColumnNames.has(activePage.value.columns[cellIndex] ?? "");
}

function isNumericCell(cell: string | number | null | undefined) {
  return typeof cell === "number" || /^[+¥\d,. -]+$/.test(String(cell));
}

function selectRole(role: ConsoleRole) {
  selectedRole.value = role;
  activePageKey.value = Object.keys(roleProfiles.value[role].pages)[0];
  searchKeyword.value = "";
  statusFilter.value = "all";
}

function selectPage(key: string) {
  activePageKey.value = key;
  searchKeyword.value = "";
  statusFilter.value = "all";
}

function triggerAction(action: string) {
  lastAction.value = `${activeRole.value.label} · ${activePage.value.title} · ${action}`;
}

function tagType(tone?: TagTone) {
  if (tone === "green") return "success";
  if (tone === "orange") return "warning";
  if (tone === "red") return "error";
  if (tone === "cyan" || tone === "blue") return "info";
  return "default";
}

async function loadOverview() {
  isLoading.value = true;
  try {
    const overview = await getCreditsAdminOverview();
    accounts.value = overview.accounts;
    functions.value = overview.functions;
    transactions.value = overview.transactions;
    products.value = overview.rechargeProducts;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    lastAction.value = `实时数据加载失败: ${message}`;
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadOverview();
});
</script>

<template>
  <main class="credits-admin-page">
    <aside class="admin-sidebar">
      <div class="brand">
        <span class="logo">鲸</span>
        <div>
          <strong>积分后台</strong>
          <span>Credits Back Office</span>
        </div>
      </div>

      <div class="role-switcher" aria-label="角色切换">
        <button
          v-for="option in roleOptions"
          :key="option.value"
          type="button"
          class="role-option"
          :class="{ active: selectedRole === option.value }"
          @click="selectRole(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="profile-box">
        <strong>{{ activeRole.name }}</strong>
        <span>{{ activeRole.meta }}</span>
      </div>

      <div class="side-label">当前账号菜单</div>
      <nav class="side-nav">
        <button
          v-for="[key, page] in pageEntries"
          :key="key"
          type="button"
          class="nav-btn"
          :class="{ active: key === activePageKey }"
          @click="selectPage(key)"
        >
          <span>{{ page.menu }}</span>
          <small>{{ page.badge }}</small>
        </button>
      </nav>
    </aside>

    <section class="main">
      <header class="topbar">
        <div>
          <p class="eyebrow">{{ activeRole.label }}</p>
          <h1>{{ activePage.title }}</h1>
          <p class="subtitle">{{ activePage.subtitle }}</p>
        </div>
        <div class="user-card">
          <strong>{{ activeRole.account }}</strong>
          <span>{{ activeRole.scope }}</span>
        </div>
      </header>

      <div class="action-row">
        <NButton type="primary" :loading="isLoading" @click="loadOverview">
          <template #icon>
            <Icon icon="mdi:refresh" />
          </template>
          刷新实时数据
        </NButton>
        <NButton
          v-for="action in activePage.actions"
          :key="action"
          secondary
          @click="triggerAction(action)"
        >
          {{ action }}
        </NButton>
      </div>

      <section class="metrics" aria-label="积分后台指标">
        <article v-for="metric in activePage.metrics" :key="metric.label" class="metric">
          <Icon :icon="metric.icon ?? 'mdi:chart-box-outline'" class="metric-icon" />
          <label>{{ metric.label }}</label>
          <strong>{{ metric.value }}</strong>
          <small>{{ metric.hint }}</small>
        </article>
      </section>

      <div class="grid">
        <section class="panel">
          <header class="panel-head">
            <div>
              <h2>{{ activePage.tableTitle }}</h2>
              <span>{{ filteredRows.length }} / {{ activePage.rows.length }} 条</span>
            </div>
            <div class="toolbar">
              <NInput
                v-model:value="searchKeyword"
                class="input"
                clearable
                size="small"
                placeholder="关键词/编号"
              />
              <NSelect
                v-model:value="statusFilter"
                class="select"
                size="small"
                :options="statusOptions"
              />
            </div>
          </header>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th v-for="column in activePage.columns" :key="column">{{ column }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!filteredRows.length">
                  <td :colspan="activePage.columns.length" class="empty-cell">暂无匹配数据</td>
                </tr>
                <tr v-for="(row, rowIndex) in filteredRows" :key="rowIndex">
                  <td v-for="(cell, cellIndex) in row.cells" :key="`${rowIndex}-${cellIndex}`">
                    <NTag
                      v-if="isTagCell(cellIndex)"
                      round
                      :bordered="false"
                      :type="tagType(row.tone)"
                    >
                      {{ cell ?? "-" }}
                    </NTag>
                    <span v-else :class="{ num: isNumericCell(cell) }">
                      {{ cell ?? "-" }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <aside class="panel">
          <header class="panel-head panel-head--compact">
            <h2>{{ activePage.sideTitle }}</h2>
          </header>
          <div class="side-list">
            <article v-for="item in activePage.side" :key="item.title" class="side-item">
              <div>
                <strong>{{ item.title }}</strong>
                <span>{{ item.desc }}</span>
              </div>
              <NTag round :bordered="false" :type="tagType(item.tone)">{{ item.tag }}</NTag>
            </article>
          </div>
        </aside>
      </div>

      <div class="note">
        <strong>当前操作:</strong>
        <span>{{ lastAction }}</span>
      </div>
      <div class="note">
        <strong>权限说明:</strong>
        <span>{{ activePage.note }}</span>
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
.credits-admin-page {
  min-height: calc(100vh - var(--app-header-offset));
  display: grid;
  grid-template-columns: 292px minmax(0, 1fr);
  background: #f8fafc;
  color: #1e293b;
}

.admin-sidebar {
  position: sticky;
  top: var(--app-header-offset);
  height: calc(100vh - var(--app-header-offset));
  overflow: auto;
  background: #0f172a;
  color: #fff;
  padding: 24px 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.logo {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: #2563eb;
  display: grid;
  place-items: center;
  font-weight: 800;
}

.brand strong,
.profile-box strong,
.side-item strong {
  display: block;
}

.brand span,
.profile-box span {
  display: block;
  margin-top: 4px;
  color: #cbd5e1;
  font-size: 12px;
  line-height: 1.5;
}

.role-switcher {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 14px;
}

.role-option {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #dbeafe;
  padding: 9px 6px;
  font-size: 12px;
  font-weight: 800;
}

.role-option.active {
  border-color: #60a5fa;
  background: #1d4ed8;
  color: #fff;
}

.profile-box {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 18px;
}

.side-label {
  margin: 16px 0 8px;
  color: #cbd5e1;
  font-size: 12px;
}

.side-nav {
  display: grid;
  gap: 4px;
}

.nav-btn {
  width: 100%;
  border: 0;
  color: inherit;
  background: transparent;
  text-align: left;
  border-radius: 8px;
  padding: 10px 11px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.nav-btn.active {
  background: #1d4ed8;
}

.nav-btn small {
  color: #cbd5e1;
  font-size: 11px;
}

.main {
  min-width: 0;
  padding: 28px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 18px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 900;
}

h1 {
  margin: 0 0 8px;
  font-size: 28px;
  letter-spacing: 0;
}

.subtitle {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.user-card {
  min-width: 300px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.user-card strong {
  display: block;
  margin-bottom: 4px;
}

.user-card span {
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}

.action-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.metric {
  position: relative;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 18px;
  min-height: 108px;
}

.metric-icon {
  position: absolute;
  right: 18px;
  top: 18px;
  color: #2563eb;
  font-size: 24px;
}

.metric label {
  display: block;
  margin-bottom: 10px;
  color: #64748b;
  font-size: 13px;
}

.metric strong {
  font-size: 25px;
  font-variant-numeric: tabular-nums;
}

.metric small {
  display: block;
  margin-top: 8px;
  color: #64748b;
  line-height: 1.4;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(340px, 0.55fr);
  gap: 18px;
  align-items: start;
}

.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.panel-head {
  border-bottom: 1px solid #e2e8f0;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.panel-head--compact {
  display: block;
}

.panel-head h2 {
  margin: 0;
  font-size: 17px;
}

.panel-head span {
  color: #64748b;
  font-size: 13px;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.input {
  width: 210px;
}

.select {
  width: 128px;
}

.table-wrap {
  overflow: auto;
}

table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  font-size: 14px;
}

th,
td {
  padding: 13px 16px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  white-space: nowrap;
  vertical-align: middle;
}

th {
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.empty-cell {
  text-align: center;
  color: #64748b;
}

.side-list {
  padding: 8px 18px 18px;
}

.side-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid #e2e8f0;
}

.side-item:last-child {
  border-bottom: 0;
}

.side-item span {
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}

.num {
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}

.note {
  margin-top: 18px;
  padding: 16px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #64748b;
  line-height: 1.7;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.note strong {
  color: #1e293b;
}

@media (max-width: 1120px) {
  .credits-admin-page {
    grid-template-columns: 1fr;
  }

  .admin-sidebar {
    position: static;
    height: auto;
  }

  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .topbar {
    flex-direction: column;
  }

  .user-card {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .main {
    padding: 18px;
  }

  .metrics {
    grid-template-columns: 1fr;
  }

  h1 {
    font-size: 22px;
  }

  .panel-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar,
  .input,
  .select {
    width: 100%;
  }
}
</style>
