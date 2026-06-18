# Reusable Credits Platform：新应用接入指南

状态：团队交接草稿
读者：即将把新应用接入 Reusable Credits Platform 的应用工程师
最后更新：2026-06-18

## 1. 平台负责什么

Reusable Credits Platform 是积分和账务的事实来源，不是每个产品应用各自复制一份的辅助表。

它负责：

- 用户和积分身份；
- 租户和租户成员关系；
- 积分账户和余额；
- 已锁定/冻结的积分；
- 不可变积分流水；
- 计费任务；
- 接入应用注册；
- 可计费功能注册和默认价格；
- 充值产品、支付订单和支付回调；
- 代理商档案、代理-客户关系、返佣记录。

接入应用负责：

- 产品自己的用户/会话记录，如果该产品有自己的登录层；
- 产品业务实体；
- 上传素材和生成结果素材；
- 产品任务/作业记录；
- 外部供应商任务 ID；
- 任务状态和交付状态；
- 产品 UI 和排查问题需要的计费快照。

接入应用不能负责：

- 用户真实积分余额；
- 积分流水；
- 充值入账逻辑；
- 支付回调验签；
- 代理-客户关系事实来源；
- 返佣计算事实来源。

新应用接入时，最安全的理解方式是：

```text
产品应用数据库 = 业务流程和本地快照
Credits Platform 数据库 = 金额/积分/账户/代理关系事实来源
```

## 2. 本地服务地图

在当前仓库中，Credits Platform 位于：

```text
external/reusable-credits-platform
```

本地默认地址：

| 服务 | 地址 | 说明 |
| --- | --- | --- |
| Credits Platform API | `http://127.0.0.1:3000` | Fastify API |
| Credits 健康检查 | `http://127.0.0.1:3000/health` | 服务存活 |
| Credits 数据库健康检查 | `http://127.0.0.1:3000/health/db` | 数据库可用性 |
| Credits Swagger UI | `http://127.0.0.1:3000/docs` | OpenAPI 页面 |
| Credits OpenAPI JSON | `http://127.0.0.1:3000/openapi.json` | 生成的接口契约 |
| Reusable Credits Console | `http://127.0.0.1:5174` | 当前仓库中的控制台前端 |

本地启动 Credits Platform：

```bash
cd external/reusable-credits-platform
npm install
docker compose up -d mysql
npm run db:migrate
npm run dev
```

usedCar 后端当前使用这些环境变量连接 Credits Platform。新应用后端建议保持同样形状：

```bash
CREDITS_PLATFORM_ENABLED=true
CREDITS_PLATFORM_BASE_URL=http://127.0.0.1:3000
CREDITS_APPLICATION_CODE=<your-app-code>
CREDITS_REQUEST_TIMEOUT_MS=8000
```

如果应用还需要为了控制台/报表做 Credits 表的只读关联查询，再单独配置 Credits 数据库连接：

```bash
CREDITS_MYSQL_HOST=127.0.0.1
CREDITS_MYSQL_PORT=3306
CREDITS_MYSQL_DATABASE=credits_platform
CREDITS_MYSQL_USER=<user>
CREDITS_MYSQL_PASSWORD=<password>
CREDITS_MYSQL_CONNECTION_LIMIT=5
```

普通计费动作应优先走 HTTP API，不要直接写 Credits 数据库。

## 3. 新应用接入检查清单

在新应用提交任何付费 AI 任务前，需要完成：

1. 确定一个稳定的 `applicationCode`。
   - 使用小写字母、数字、连字符或下划线。
   - 示例：`used-car-platform`、`clothing_ai`。
2. 在 Credits Platform 注册应用。
3. 在该应用下注册所有可计费功能。
4. 确定本地 `bizType` 和 `bizId` 格式。
5. 给本地任务表增加计费状态快照字段。
6. 从真实应用登录态解析 Credits 用户身份。
7. 调用外部 AI 供应商前，先 estimate 并 freeze 积分。
8. 任务成功时只 settle 一次。
9. 任务失败或取消时只 refund 一次。
10. 增加冒烟测试：余额不足、供应商失败退款、成功扣费、幂等重试。

## 4. 应用和功能注册

注册应用：

```http
POST /integration/applications
Content-Type: application/json
```

```json
{
  "code": "new-ai-app",
  "name": "New AI App",
  "description": "AI generation app connected to Reusable Credits Platform",
  "status": "active"
}
```

注册可计费功能：

```http
POST /integration/applications/new-ai-app/functions
Content-Type: application/json
```

```json
{
  "code": "image_generate",
  "name": "Image Generate",
  "description": "Generate one image",
  "chargeMode": "estimate_required",
  "defaultPoints": "30.0000",
  "status": "active"
}
```

支持的 `chargeMode`：

| 模式 | 适用场景 |
| --- | --- |
| `fixed` | 每次调用固定消耗注册的 `defaultPoints`。 |
| `dynamic` | 应用后端根据可信选项计算费用。 |
| `estimate_required` | 执行前必须传入或确认估算费用。AI 生成类任务优先用这个模式。 |

不要让前端决定 `defaultPoints`、`estimatedPoints`、折扣规则或返佣比例。这些值必须来自后端可信逻辑和 Credits Platform 的功能目录。

常用查询接口：

```http
GET /integration/contract
GET /integration/applications
GET /integration/applications/{applicationCode}/functions
GET /openapi.json
GET /docs
```

## 5. 计费身份

每个计费调用都需要 Credits 身份：

```ts
type BillingIdentity = {
  userId: number              // Credits Platform 用户 ID
  accountScope: 'personal' | 'tenant'
  tenantId?: number           // accountScope 为 tenant 时必填
}
```

规则：

- `userId` 是 Credits Platform 用户 ID，不一定等于产品应用本地用户主键。
- `personal` 会解析 `credit_accounts.user_id = userId` 的有效个人账户。
- `tenant` 会先校验有效 `tenant_members` 成员关系，再解析租户账户。
- 租户计费缺少 `tenantId` 时，请求无效。
- 如果账户不存在，不要创建本地兜底余额表；应创建或修复 Credits Platform 账户。

usedCar 代理接口当前使用的前端身份头：

```http
x-credits-user-id: 4
x-credits-account-scope: personal
```

租户示例：

```http
x-credits-user-id: 4
x-credits-account-scope: tenant
x-credits-tenant-id: 4
```

新应用在生产环境中应从后端认证会话推导这些值，不要信任可编辑的前端输入。

## 6. 运行时计费生命周期

必需生命周期：

```text
创建本地产品任务
-> POST /billing/estimate
-> POST /billing/freeze
-> 只有 freeze 成功后才调用外部 AI 供应商
-> 成功时 POST /billing/settle
-> 失败/取消时 POST /billing/refund
```

### 6.1 Estimate

```http
POST /billing/estimate
Content-Type: application/json
```

```json
{
  "userId": 4,
  "accountScope": "personal",
  "applicationCode": "new-ai-app",
  "functionCode": "image_generate",
  "estimatedPoints": "30.0000",
  "bizType": "new_app_generation_task",
  "bizId": "task_01HXYZ",
  "idempotencyKey": "estimate:new_app_generation_task:task_01HXYZ"
}
```

说明：

- 只有注册功能默认价格足够表达本次费用时，才可以省略 `estimatedPoints`。
- 动态定价必须由应用后端计算 `estimatedPoints`。
- 响应会返回 `billingTaskId`；应用必须本地持久化。

### 6.2 Freeze

```http
POST /billing/freeze
Content-Type: application/json
```

```json
{
  "userId": 4,
  "billingTaskId": 58,
  "idempotencyKey": "freeze:new_app_generation_task:task_01HXYZ"
}
```

如果 freeze 因余额不足失败，不要把任务提交给外部 AI 供应商。

### 6.3 成功后 Settle

```http
POST /billing/settle
Content-Type: application/json
```

```json
{
  "userId": 4,
  "billingTaskId": 58,
  "idempotencyKey": "settle:new_app_generation_task:task_01HXYZ"
}
```

只有外部供应商返回成功终态后才调用 settle。

### 6.4 失败或取消后 Refund

```http
POST /billing/refund
Content-Type: application/json
```

```json
{
  "userId": 4,
  "billingTaskId": 58,
  "idempotencyKey": "refund:new_app_generation_task:task_01HXYZ"
}
```

以下情况调用 refund：

- freeze 成功后，外部供应商提交失败；
- 外部供应商返回失败终态；
- 用户取消了已经冻结积分的任务；
- 应用超时策略将任务标记为失败。

## 7. 幂等契约

所有改变积分状态的请求都必须带确定性的 `idempotencyKey`。

推荐格式：

| 操作 | Key |
| --- | --- |
| estimate | `estimate:<bizType>:<bizId>` |
| freeze | `freeze:<bizType>:<bizId>` |
| settle | `settle:<bizType>:<bizId>` |
| refund | `refund:<bizType>:<bizId>` |
| payment order | `payment_order:<userId>:<productId>:<clientRequestId>` |

行为：

- 相同 key + 相同请求体，返回原响应并带 `idempotentReplay: true`。
- 相同 key + 不同请求体，返回 `409 conflict`。
- 第一次请求仍在处理中时重试，返回 conflict。

因此，重试逻辑必须用相同 key 发送完全相同的请求体。

## 8. 本地应用数据库字段

应用需要持久化足够的信息来排查问题和完成计费终态，但不能变成账务流水库。

每个可计费任务表建议字段：

| 字段 | 用途 |
| --- | --- |
| `credits_user_id` | 本次计费使用的 Credits Platform 用户 ID |
| `credits_tenant_id` | 租户计费时的 Credits 租户 ID |
| `account_scope` | `personal` 或 `tenant` |
| `billing_task_id` | Credits Platform 计费任务 ID |
| `billing_status` | 快照：`estimated`、`frozen`、`settled`、`refunded`、`settle_failed`、`refund_failed` |
| `estimated_points` | UI/排查用估算积分快照 |
| `settled_points` | settle 后积分快照 |
| `credits_application_code` | 本地应用支持多 app code 时有用 |
| `credits_function_code` | 被计费的功能 |

本地应用也可以保存：

- 外部供应商任务 ID；
- 供应商状态；
- 重试次数；
- 最后一次计费错误；
- 生成结果 URL。

本地应用不能保存或修改：

- `credit_accounts.total_balance`；
- `credit_accounts.locked_balance`；
- `credit_accounts.available_balance`；
- 作为事实来源的 `credit_transactions`；
- 作为事实来源的支付回调结算状态。

## 9. 余额、流水和充值 UI

如果新应用有前端，应由应用后端暴露代理接口，而不是让浏览器直接调用 Credits Platform。

推荐应用后端代理接口：

```http
GET  /api/v1/credits/accounts
GET  /api/v1/credits/transactions
GET  /api/v1/credits/recharge-products
POST /api/v1/credits/payment-orders
```

为什么要代理：

- 隐藏 Credits Platform base URL；
- 从应用认证/会话推导计费身份；
- 防止前端选择高权限 user/tenant ID；
- 保持应用自己的响应包格式一致。

代理背后的 Credits Platform 直接接口：

```http
GET  /me/accounts?userId=4
GET  /accounts/{accountId}/transactions?userId=4&limit=50
GET  /recharge-products
POST /payment-orders
GET  /payment-orders/{paymentOrderId}?userId=4
```

创建支付订单示例：

```json
{
  "userId": 4,
  "accountScope": "personal",
  "productId": 1,
  "payChannel": "wechat",
  "idempotencyKey": "payment_order:4:1:req_01HXYZ"
}
```

支付回调由 Credits Platform 处理：

```http
POST /payment-callbacks/{channel}
```

回调必须使用 `PAYMENT_CALLBACK_SECRET` 验签。产品应用不应实现自己的充值入账流水。

## 10. 代理和客户关系

代理-客户关系属于 Credits Platform 数据库。

以下内容由 Credits Platform 负责：

- 谁是已批准代理商；
- 哪些用户属于哪个代理商；
- 直接/间接关系类型；
- 返佣比例；
- 返佣生成和结算。

相关直接接口：

```http
POST /agent-applications
GET  /platform/agent-applications?currentUserId=4&status=pending&limit=50
POST /platform/agent-applications/{userId}/approve
POST /platform/agent-applications/{userId}/reject
POST /platform/agents/{userId}/suspend
POST /agent-relations
GET  /agent-commissions?agentUserId=4&status=pending&limit=50
POST /agent-commissions/generate
POST /agent-commissions/{commissionId}/settle
POST /agent-commissions/{commissionId}/cancel
```

接入应用可以缓存代理显示名称等表格展示字段，但关系本身必须从 Credits Platform ID 解析。如果用户没有代理关系，控制台应显示为平台自有，而不是虚构一条应用本地关系。

## 11. 错误处理预期

常见响应：

| 状态 | 含义 | 应用行为 |
| --- | --- | --- |
| `400` | 请求错误、缺少 tenant id、积分格式无效 | 修正请求构造 |
| `402` | 积分不足 | 显示充值/余额不足；不要提交供应商任务 |
| `403` | 租户成员关系或权限被拒绝 | 停止并显示授权错误 |
| `404` | 账户/功能/任务不存在 | 检查身份、种子数据或注册状态 |
| `409` | 幂等冲突或生命周期状态不合法 | 只有 key 和 body 完全一致时才重试；否则检查本地计费状态 |

重要生命周期冲突：

- 对非 `estimated` 任务 freeze 会冲突。
- 对非 `frozen` 任务 settle/refund 会冲突。
- 用改变后的请求体复用幂等 key 会冲突。

## 12. 应用团队测试清单

至少增加可自动化或可脚本化测试：

1. 应用注册和功能注册；
2. estimate 返回 `billingTaskId`；
3. 余额不足时 freeze 阻止供应商提交；
4. 供应商成功结果会 settle 计费任务；
5. 供应商失败结果会 refund 计费任务；
6. 重复终态处理不会重复 settle 或重复 refund；
7. 相同幂等 key + 相同请求体会 replay；
8. 相同幂等 key + 不同请求体会 conflict；
9. 租户计费拒绝非成员；
10. 流水历史包含 estimate/freeze/settle/refund；
11. 充值产品列表通过应用代理加载；
12. 支付订单创建使用服务端推导的身份。

Credits Platform 检查：

```bash
cd external/reusable-credits-platform
npm run lint
npm run typecheck
npm test
npm run test:integration
```

当前 usedCar 接入形态检查：

```bash
cd backend
npm run phase7:integration-contract-test
npm run phase11:smoke
```

## 13. 上线前集成评审问题

新应用生产接入前，需要回答：

- 最终 `applicationCode` 是什么？
- 所有 `functionCode` 和默认积分是多少？
- 哪些功能固定价格，哪些功能动态/估算价格？
- 每类任务的本地 `bizType` 是什么？
- 应用在哪里持久化 `billingTaskId` 和计费快照？
- 后端如何把应用用户/会话映射到 Credits `userId`？
- 是否支持租户计费？如果支持，在哪里校验成员关系？
- freeze 成功但供应商提交失败时怎么处理？
- 应用在 settle/refund 前崩溃时怎么补偿？
- 哪个定时修复任务或轮询路径会处理卡在 `frozen` 的任务？
- 哪些前端页面需要余额、流水或充值产品？
- 是否需要按代理商筛选客户？如果需要，必须使用 Credits Platform 关系。

## 14. 当前仓库中的有用源码

Credits Platform：

- `external/reusable-credits-platform/docs/integration-contract.md`
- `external/reusable-credits-platform/src/http/billing-routes.ts`
- `external/reusable-credits-platform/src/billing/billing-service.ts`
- `external/reusable-credits-platform/src/http/integration-routes.ts`
- `external/reusable-credits-platform/src/integration/integration-service.ts`
- `external/reusable-credits-platform/src/http/payment-routes.ts`
- `external/reusable-credits-platform/src/http/agent-routes.ts`
- `external/reusable-credits-platform/tests/phase-8.integration.test.ts`

usedCar 接入示例：

- `backend/src/modules/billing/creditsClient.ts`
- `backend/src/modules/billing/billingLifecycle.ts`
- `backend/src/modules/billing/billingIdentity.ts`
- `backend/src/modules/billing/creditFunctionCatalog.ts`
- `backend/src/modules/billing/creditFunctionSync.ts`
- `backend/src/modules/billing/creditsRoutes.ts`
- `backend/src/modules/platform/applicationIntegrationContract.ts`
- `backend/scripts/phase11-e2e-smoke.mjs`

团队文档：

- `docs/credits-platform-new-app-integration-guide.md`
- `docs/credits-platform-new-app-integration-guide.zh-CN.md`
