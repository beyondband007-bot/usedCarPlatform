# 前端余额与交易流水 API 文档

日期：2026-06-01
分支：`feat/reusable-credits-integration`

本文档面向需要在 usedCarPlatform 页面中展示积分余额和交易流水的前端同事。

前端代码应调用 usedCar 后端代理接口，不要直接调用 Reusable Credits Platform。

```text
本地 usedCar 后端基础地址：
http://127.0.0.1:3101/api/v1

积分代理挂载路径：
/credits
```

## 响应包裹格式

usedCar 后端所有响应都使用同一层包裹：

```ts
interface ApiResponse<T> {
  code: number
  message: string
  data: T
  requestId: string
}
```

成功请求返回：

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "requestId": "req_xxx"
}
```

前端封装已在以下文件中提供：

```text
src/api/visual-workbench.ts
```

可使用：

- `getCreditAccounts`
- `getCreditTransactions`
- `getCreditsAdminOverview`

## 临时身份约定

在生产登录和 session 尚未接入之前，前端必须提供一个积分身份。

推荐使用请求头：

```http
x-credits-user-id: 4
x-credits-account-scope: personal
```

测试企业/租户账户时：

```http
x-credits-user-id: 4
x-credits-account-scope: tenant
x-credits-tenant-id: 4
```

当前前端 mock 登录会把该身份存入 localStorage，共用 Axios client 会自动注入这些请求头。

也支持手动 query 参数兜底：

```text
?creditsUserId=4&accountScope=personal
?creditsUserId=4&accountScope=tenant&creditsTenantId=4
```

## 获取账户余额

```http
GET /api/v1/credits/accounts
```

用途：

- 获取当前身份可见的所有积分账户
- 展示当前余额、冻结余额和总余额
- 支撑顶部余额、积分页面余额卡片和账户选择器

Query 参数：

| 名称 | 是否必填 | 说明 |
| --- | --- | --- |
| `creditsUserId` / `userId` | 如果已提供请求头，则否 | 积分用户 ID。 |
| `accountScope` | 如果已提供请求头，则否 | `personal` 或 `tenant`。 |
| `creditsTenantId` / `tenantId` | tenant scope 时必填 | 用于查询企业/租户账户的租户 ID。 |

示例：

```sh
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  http://127.0.0.1:3101/api/v1/credits/accounts
```

响应 `data` 结构：

```ts
interface CreditAccount {
  id: number
  tenantId: number | null
  userId: number | null
  accountScope: 'personal' | 'tenant'
  totalBalance: string
  lockedBalance: string
  availableBalance: string
  currency: string
  status: string
}

interface CreditAccountsData {
  accounts: CreditAccount[]
}
```

示例 `data`：

```json
{
  "accounts": [
    {
      "id": 3,
      "tenantId": null,
      "userId": 4,
      "accountScope": "personal",
      "totalBalance": "100000.0000",
      "lockedBalance": "0.0000",
      "availableBalance": "100000.0000",
      "currency": "credits",
      "status": "active"
    }
  ]
}
```

前端展示建议：

- 顶部余额：使用当前账户的 `availableBalance`。
- 冻结余额：使用 `lockedBalance`。
- 总余额：使用 `totalBalance`。
- 所有数值都会以 decimal string 返回。只在展示计算时使用 `Number(value)` 转换；如果涉及精度，保留原始字符串。
- `availableBalance = totalBalance - lockedBalance`。

## 获取交易流水

```http
GET /api/v1/credits/transactions
```

用途：

- 获取某一个账户的不可变积分账本记录
- 展示积分页面交易流水
- 展示充值、预估、冻结、结算、退款和人工调整记录

Query 参数：

| 名称 | 是否必填 | 说明 |
| --- | --- | --- |
| `accountId` | 否 | 精确积分账户 ID。如果不传，后端会根据当前身份解析账户。 |
| `limit` | 否 | 最大返回条数，范围 1-100。 |
| `creditsUserId` / `userId` | 如果已提供请求头，则否 | 积分用户 ID。 |
| `accountScope` | 如果已提供请求头，则否 | `personal` 或 `tenant`。当 `accountId` 为空时用于账户解析。 |
| `creditsTenantId` / `tenantId` | tenant scope 时必填 | 解析企业/租户账户时使用的租户 ID。 |

示例，默认个人账户：

```sh
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  "http://127.0.0.1:3101/api/v1/credits/transactions?limit=50"
```

示例，指定账户：

```sh
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  "http://127.0.0.1:3101/api/v1/credits/transactions?accountId=3&limit=50"
```

响应 `data` 结构：

```ts
interface CreditTransaction {
  id: number
  tenantId: number | null
  userId: number
  accountId: number
  billingTaskId: number | null
  paymentOrderId: number | null
  applicationId: number | null
  functionId: number | null
  txnType: string
  points: string
  balanceBefore: string
  balanceAfter: string
  bizType: string | null
  bizId: string | null
  refTxnId: number | null
  remark: string | null
  createdAt: string
}

interface CreditTransactionsData {
  account: CreditAccount
  transactions: CreditTransaction[]
}
```

示例 `data`：

```json
{
  "account": {
    "id": 3,
    "tenantId": null,
    "userId": 4,
    "accountScope": "personal",
    "totalBalance": "100000.0000",
    "lockedBalance": "30.0000",
    "availableBalance": "99970.0000",
    "currency": "credits",
    "status": "active"
  },
  "transactions": [
    {
      "id": 120,
      "tenantId": null,
      "userId": 4,
      "accountId": 3,
      "billingTaskId": 88,
      "paymentOrderId": null,
      "applicationId": 2,
      "functionId": 14,
      "txnType": "settle",
      "points": "-30.0000",
      "balanceBefore": "100000.0000",
      "balanceAfter": "99970.0000",
      "bizType": "generation_task",
      "bizId": "task_xxx",
      "refTxnId": null,
      "remark": "billing settle",
      "createdAt": "2026-06-01T10:00:00.000Z"
    }
  ]
}
```

交易类型展示映射：

| `txnType` | 建议展示文案 | 含义 |
| --- | --- | --- |
| `recharge` | 充值积分 | 充值/支付后增加积分。 |
| `estimate` | 费用预估 | 预估记录，不改变余额。 |
| `freeze` | 冻结积分 | 生成开始前锁定积分，通常为负数。 |
| `settle` | 结算扣减 | 生成成功后消耗已冻结积分，通常为负数。 |
| `refund` | 失败退回 | 生成失败/取消后退回冻结积分，通常为正数。 |
| `adjust` | 人工调整 | 管理员或平台手动调整。 |

前端展示建议：

- 使用 `points` 的正负判断收入/支出：
  - `Number(points) >= 0`：收入
  - `Number(points) < 0`：支出
- 每行余额展示 `balanceAfter`。
- 如果前端做了客户端合并排序，按最新时间优先展示。
- `bizType` 和 `bizId` 可用于把流水关联回 usedCar 任务或支付上下文。
- `billingTaskId` 可把生成类流水关联到 Reusable Credits Platform 的计费任务。
- `paymentOrderId` 可把充值类流水关联到支付订单。

## 获取后台总览

```http
GET /api/v1/credits/admin/overview
```

用途：

- 获取后台/管理页面使用的综合快照
- 包含当前身份、应用元数据、功能价格、账户、最近交易流水和充值产品

Query 参数：

与 `/credits/accounts` 使用相同的身份参数。

示例：

```sh
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  http://127.0.0.1:3101/api/v1/credits/admin/overview
```

响应 `data` 结构：

```ts
interface CreditsAdminOverview {
  identity: {
    userId: number
    accountScope: 'personal' | 'tenant'
    tenantId?: number
  }
  applications: Array<{
    id: number
    code: string
    name: string
    description: string | null
    status: string
  }>
  functions: Array<{
    id: number
    applicationId: number
    applicationCode?: string
    code: string
    name: string
    description: string | null
    chargeMode: 'fixed' | 'dynamic' | 'estimate_required'
    defaultPoints: string
    status: string
  }>
  accounts: CreditAccount[]
  transactions: CreditTransaction[]
  rechargeProducts: Array<{
    id: number
    name: string
    amount: string
    points: string
    bonusPoints: string
    currency: string
    sort: number
    enabled: boolean
  }>
}
```

说明：

- `transactions` 是当前可见账户的最近流水合并列表，最多 50 条。
- 后台总览卡片和运营检查页面可以使用该接口。
- 普通客户侧余额和账本页面优先使用 `/credits/accounts` 和 `/credits/transactions`。

## 错误格式

错误响应也使用同一层包裹：

```json
{
  "code": 40000,
  "message": "credits user id is required",
  "data": {
    "headers": ["x-credits-user-id", "x-user-id"],
    "queryOrBody": ["creditsUserId", "userId"]
  },
  "requestId": "req_xxx"
}
```

常见情况：

| HTTP 状态码 | 含义 | 前端处理建议 |
| --- | --- | --- |
| `400` | 身份或账户参数缺失/非法。 | 提示用户重新登录，或展示账户配置错误。 |
| `402` | 创建生成任务时积分不足。 | 展示充值/升级提示。 |
| `404` | 路由不存在。 | 检查基础 URL 和路径。 |
| `500` | 后端或积分平台不可用。 | 展示重试提示。 |

## 当前限制

- 暂时没有单独的 `/balance` 接口。余额从 `/credits/accounts` 读取。
- 交易流水查询目前一次返回一个账户。如果需要展示多个账户，可以对每个账户调用一次 `/credits/transactions?accountId=...`，或在管理页面使用 `/credits/admin/overview`。
- 首发版本中，旗舰档母账号/子账号可见性仍有一部分本地 demo 逻辑。生产级持久化账户层级和服务端母子账户流水聚合属于后续工作。
