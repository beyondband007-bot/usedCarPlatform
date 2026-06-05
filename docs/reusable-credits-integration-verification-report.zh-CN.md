# Reusable Credits Platform x usedCarPlatform 集成验证报告

日期：2026-06-01
分支：`feat/reusable-credits-integration`
Pull Request：`beyondband007-bot/usedCarPlatform#1`

## 1. 概要

Reusable Credits Platform 已经作为当前 MVP 的积分与计费模块集成到 usedCarPlatform 中。

本次集成保持两个系统为独立服务：

- Reusable Credits Platform 负责积分、计费、充值、支付订单、计费任务、冻结锁以及不可变积分流水。
- usedCarPlatform 负责车辆素材、生成任务、批量任务、KIE 任务记录、生成结果和交付素材。

这是有意选择的架构。usedCarPlatform 不复制完整的积分数据库，只保存必要的追踪字段，用于把 usedCar 的生成任务和批量任务关联回 Reusable Credits Platform 的计费记录。

## 2. 已完成内容

### 已完成：积分/计费数据库集成

当前积分/计费集成所需的数据库工作已经完成。

Reusable Credits Platform 的 MySQL 是计费数据的事实来源，包含以下核心表：

- `users`
- `tenants`
- `tenant_members`
- `applications`
- `application_functions`
- `credit_accounts`
- `recharge_products`
- `payment_orders`
- `payment_callbacks`
- `billing_tasks`
- `billing_locks`
- `credit_transactions`
- `idempotency_keys`
- `tenant_settlements`
- `agent_relations`
- `agent_commissions`

usedCarPlatform 的 MySQL 保存本地业务任务数据以及计费追踪字段：

- `generation_tasks.credits_user_id`
- `generation_tasks.credits_tenant_id`
- `generation_tasks.account_scope`
- `generation_tasks.billing_task_id`
- `generation_tasks.billing_status`
- `generation_tasks.estimated_points`
- `generation_tasks.settled_points`
- `batch_tasks.credits_user_id`
- `batch_tasks.credits_tenant_id`
- `batch_tasks.account_scope`
- `batch_tasks.estimated_points`
- `batch_tasks.settled_points`

这些字段足够把每个 usedCar 单任务或批量任务关联回 Reusable Credits Platform 中的计费记录。

### 已完成：计费流程集成

当前集成已经支持：

- usedCar 前端加载真实积分账户余额。
- usedCar 前端加载真实积分流水。
- usedCar 前端加载真实充值产品。
- 通过 usedCar 后端代理创建支付订单。
- 支持的单图生成任务在提交 KIE 前先预估并冻结积分。
- 生成任务成功时结算积分。
- 生成任务失败或取消时退还冻结积分。
- 批量任务按每个支持的子任务冻结积分。
- 批量子任务根据最终状态分别结算或退款。
- 积分不足时，在提交 KIE 前阻止任务创建。
- usedCar 积分后台可以查看实时积分数据。

### 已完成：三角色后台 UI

同事提供的静态原型 `积分后台-三角色静态原型.html` 已经迁移到 usedCarPlatform 的 Vue 路由：

```text
/reusable-credits-console
```

该路由包含：

- 开发者后台
- 公司管理员后台
- 代理商后台

当前后台中的实时数据来自 usedCar 后端代理接口：

```http
GET /api/v1/credits/admin/overview
```

该接口加载：

- 应用信息
- usedCarPlatform 功能计费配置
- 积分账户
- 充值产品
- 最近积分流水

## 3. 尚未完成内容

三角色后台 UI 已经完成，可用于产品评审和后端 API 设计评审，但并不是所有后台运营流程都已经有生产级数据库/API 实现。

以下页面目前使用本地 UI 数据，因为 usedCarPlatform 还没有对应的生产接口：

- 代理商线索/商机报备
- 代理商客户 CRM 流程
- 返佣记录
- 结算账单
- 营销物料/培训
- 工单支持
- 生产级开发者/管理员 CRUD 和审批流程

这些内容与当前积分/计费集成是分开的。计费 MVP 已经完成；后续工作是运营后台数据库/API 层。

## 4. 本地启动步骤

### 4.1 启动 Reusable Credits Platform

```bash
cd "/Users/shenghangwang/Documents/Reusable Credits Platform"
docker compose up -d mysql
npm install
npm run db:migrate
npm run seed:used-car:demo
npm run dev
```

预期 API 地址：

```text
http://127.0.0.1:3000
```

API 根路径 `/` 返回 `404` 是正常现象。请使用：

```text
http://127.0.0.1:3000/health
http://127.0.0.1:3000/health/db
http://127.0.0.1:3000/docs
```

### 4.2 启动 usedCarPlatform 后端

```bash
cd "/Users/shenghangwang/Desktop/usedCarPlatform-credits-integration/backend"
npm install
npm run migrate
npm run dev
```

预期 API 地址：

```text
http://127.0.0.1:3101
```

API 根路径 `/` 返回 `404` 是正常现象。请使用：

```text
http://127.0.0.1:3101/health
```

### 4.3 启动 usedCarPlatform 前端

```bash
cd "/Users/shenghangwang/Desktop/usedCarPlatform-credits-integration"
npm install
npm run dev
```

预期前端地址：

```text
http://127.0.0.1:5173
```

## 5. 本地登录账号

当前 usedCarPlatform 仍然使用 mock 登录。

打开：

```text
http://127.0.0.1:5173/login
```

普通产品用户：

```text
username: enterprise
password: 123456
```

该用户名保留用于兼容现有前端。它是普通产品用户登录名，不属于三角色积分后台。

如果该用户需要成为代理商，必须由平台 `developer` 或 `admin` 在三角色积分后台中开通/升级。用户不能在前台登录中自助升级为代理商。

管理员用户：

```text
username: admin
password: 123456
```

开发者用户：

```text
username: developer
password: 123456
```

代理商用户：

```text
username: agent
password: 123456
```

使用 `enterprise` 测试普通产品用户页面：

- `/workspace`
- `/credits`
- `/package-points`

`enterprise` 用户不应该能够进入 `/reusable-credits-console`。

使用 `admin` 测试：

- `/reusable-credits-console`

使用 `developer` 可以评审所有后台角色视图。使用 `agent` 可以验证该登录只能看到代理商后台视图。

`/reusable-credits-console` 内部的角色切换器目前用于原型/演示评审。真实的开发者/管理员/代理商登录与权限隔离属于后续生产认证与权限阶段。

账号创建层级：

- Developer 可以创建 Admin、Agent、User。
- Developer 开关控制 Admin 是否可以创建 Agent 和 User。
- Developer 可以禁用 Agent 创建 User。
- Admin 在 Developer 允许时可以创建 Agent 和 User。
- Admin 开关控制 Agent 是否可以创建 User。
- Admin 开关控制 User 是否可以成为 Agent。
- Agent 在 Admin 允许且 Developer 未禁用时可以创建 User。
- User 在未成为 Agent 之前，不能登录该控制台。

角色能力矩阵：

| 角色 | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| Developer | Admin、Agent、User | 全部流水与余额 | 增减积分 | Admin、Agent、User |
| Admin | Agent、User | 全部流水与余额 | 增减积分 | Agent、User |
| Agent | User | 自己创建的 User 的流水与余额 | 无 | 无 |

## 6. 自动化验证

最重要的集成证明是 Phase 11 smoke test。

运行：

```bash
cd "/Users/shenghangwang/Desktop/usedCarPlatform-credits-integration/backend"
npm run phase11:smoke
```

该测试会验证：

- Reusable Credits Platform 健康检查。
- usedCar 后端健康检查。
- usedCar 积分账户代理接口。
- usedCar 充值产品代理接口。
- 通过 usedCar 代理创建支付订单。
- 通过 usedCar 代理加载积分后台概览。
- 单图生成成功后结算积分。
- 单图生成失败后退还积分。
- 批量任务中成功/失败子任务分别结算/退款。
- 积分不足时，在提交 KIE 前阻止 usedCar 创建任务。

预期最终输出：

```text
Phase 11 smoke passed: 10 checks, runId=phase11_...
```

该 smoke runner 不会调用真实 KIE，也不会消耗 KIE 额度。它会创建确定性的本地 `phase11_*` 数据，并走同一套计费终态处理代码路径。

## 7. 数据库验证

### 7.1 验证 usedCarPlatform MySQL 迁移

连接 usedCarPlatform 的 MySQL 数据库，执行：

```sql
SHOW COLUMNS FROM generation_tasks LIKE '%credits%';
SHOW COLUMNS FROM generation_tasks LIKE '%billing%';
SHOW COLUMNS FROM generation_tasks LIKE '%points%';

SHOW COLUMNS FROM batch_tasks LIKE '%credits%';
SHOW COLUMNS FROM batch_tasks LIKE '%points%';
```

预期结果：

- `generation_tasks` 包含积分身份字段、计费任务 id/status、预估积分和结算积分。
- `batch_tasks` 包含积分身份字段、账户范围、预估积分和结算积分。

运行 `npm run phase11:smoke` 后，执行：

```sql
SELECT
  id,
  module_code,
  status,
  credits_user_id,
  credits_tenant_id,
  account_scope,
  billing_task_id,
  billing_status,
  estimated_points,
  settled_points,
  created_at
FROM generation_tasks
WHERE id LIKE 'phase11_%'
ORDER BY created_at DESC
LIMIT 20;
```

预期结果：

- 能看到以 `phase11_` 开头的任务行。
- 成功任务的 `billing_status = 'settled'`。
- 失败任务的 `billing_status = 'refunded'`。
- `billing_task_id` 已填充，并且积分字段有记录。

批量任务验证：

```sql
SELECT
  id,
  project_name,
  status,
  credits_user_id,
  account_scope,
  estimated_points,
  settled_points,
  created_at
FROM batch_tasks
WHERE id LIKE 'phase11_%'
ORDER BY created_at DESC
LIMIT 10;
```

预期结果：

- 能看到带积分身份和积分汇总的批量任务行。
- 批量任务积分汇总来自子 generation task 的计费记录。

### 7.2 验证 Reusable Credits Platform MySQL Schema

连接 Reusable Credits Platform 的 MySQL 数据库，执行：

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'users',
    'tenants',
    'applications',
    'application_functions',
    'credit_accounts',
    'recharge_products',
    'payment_orders',
    'billing_tasks',
    'billing_locks',
    'credit_transactions',
    'idempotency_keys'
  )
ORDER BY table_name;
```

预期结果：

- 上述表全部存在。

验证 usedCar 应用 seed：

```sql
SELECT id, code, name, status
FROM applications
WHERE code = 'used-car-platform';
```

预期结果：

- 存在一条 active 应用记录，`code = 'used-car-platform'`。

验证 usedCar 功能计费配置：

```sql
SELECT af.code, af.name, af.default_points, af.status
FROM application_functions af
JOIN applications a ON a.id = af.application_id
WHERE a.code = 'used-car-platform'
ORDER BY af.code;
```

预期结果：

- 可以看到 usedCar 生成模块对应的功能行，包括：
  - `showroom-light`
  - `outdoor-scene`
  - `road-motion`
  - `sky-studio`
  - `paint-refresh`
  - `light-consistency`
  - `interior-clean`
  - `watermark-remove`
  - `batch-new-exterior`
  - `batch-new-interior`

验证积分账户：

```sql
SELECT
  id,
  user_id,
  tenant_id,
  account_scope,
  total_balance,
  locked_balance,
  available_balance,
  status
FROM credit_accounts
ORDER BY id;
```

预期结果：

- seed 后存在 demo 个人账户和企业账户。
- `available_balance = total_balance - locked_balance`。

验证 smoke 创建的计费任务：

```sql
SELECT
  id,
  user_id,
  account_id,
  biz_type,
  biz_id,
  estimated_points,
  frozen_points,
  settled_points,
  status,
  created_at
FROM billing_tasks
WHERE biz_id LIKE 'phase11_%'
ORDER BY created_at DESC
LIMIT 20;
```

预期结果：

- 能看到 smoke runner 创建的记录。
- 成功任务的计费记录最终为 `settled`。
- 失败任务的计费记录最终为 `refunded`。

验证不可变积分流水：

```sql
SELECT
  id,
  txn_type,
  points,
  balance_before,
  balance_after,
  billing_task_id,
  payment_order_id,
  biz_type,
  biz_id,
  created_at
FROM credit_transactions
WHERE biz_id LIKE 'phase11_%'
ORDER BY created_at DESC
LIMIT 30;
```

预期结果：

- 能看到 estimate/freeze/settle/refund 等流水。
- 积分流水是 append-only 记录，不应手动修改历史流水。

## 8. API 验证

两个服务都启动后，可以验证 usedCar 后端代理接口。

积分账户：

```bash
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  http://127.0.0.1:3101/api/v1/credits/accounts
```

充值产品：

```bash
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  http://127.0.0.1:3101/api/v1/credits/recharge-products
```

最近流水：

```bash
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  http://127.0.0.1:3101/api/v1/credits/transactions
```

积分后台概览：

```bash
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  http://127.0.0.1:3101/api/v1/credits/admin/overview
```

预期结果：

- usedCar 后端返回来自 Reusable Credits Platform 的数据。
- 前端不需要直接调用 Reusable Credits Platform。

## 9. 前端验证

### 9.1 普通用户流程

1. 打开 `http://127.0.0.1:5173/login`。
2. 使用以下账号登录：

```text
username: enterprise
password: 123456
```

3. 选择默认 mock 积分身份。
4. 确认 header/subnav 中的积分余额加载成功。
5. 打开 `/credits`。
6. 确认积分流水加载成功。
7. 打开 `/package-points`。
8. 确认充值产品加载成功。
9. 创建充值订单，并确认返回 pending 支付订单。

### 9.2 管理后台流程

1. 打开 `http://127.0.0.1:5173/login`。
2. 使用以下账号登录：

```text
username: admin
password: 123456
```

3. 打开：

```text
http://127.0.0.1:5173/reusable-credits-console
```

4. 点击 `刷新实时数据`。
5. 切换以下角色：
   - 开发者
   - 公司管理员
   - 代理商
6. 确认开发者/管理员的积分相关页面中出现实时 function/account/product/transaction 数据。
7. 确认代理商页面展示线索、客户、消费、返佣、结算、物料和工单，这些是下一阶段后端 API 目标。

## 10. 代码位置

Reusable Credits Platform：

- 核心 schema migration：`migrations/000002_phase_1_core_schema.cjs`
- usedCar 应用/功能 seed：`scripts/seed-used-car-platform.cjs`

usedCarPlatform：

- MySQL schema 和 migrations：`backend/src/db/migrations.ts`
- 向后兼容迁移辅助逻辑：`backend/src/db/migrate.ts`
- 积分 API 代理路由：`backend/src/modules/billing/creditsRoutes.ts`
- Credits Platform HTTP client：`backend/src/modules/billing/creditsClient.ts`
- 计费生命周期：`backend/src/modules/billing/billingLifecycle.ts`
- 计费身份解析：`backend/src/modules/billing/billingIdentity.ts`
- 单图生成集成示例：
  - `backend/src/modules/showroom-light/showroomLightService.ts`
  - `backend/src/modules/paint-refresh/paintRefreshService.ts`
  - `backend/src/modules/light-consistency/lightConsistencyService.ts`
  - `backend/src/modules/interior-clean/interiorCleanService.ts`
  - `backend/src/modules/watermark-remove/watermarkRemoveService.ts`
- 批量任务集成：`backend/src/modules/batch-new/batchService.ts`
- E2E smoke runner：`backend/scripts/phase11-e2e-smoke.mjs`
- 前端积分 API client：`src/api/visual-workbench.ts`
- 前端 mock 积分身份：`src/utils/credits-identity.ts`
- 普通积分页：`src/pages/credits/index.vue`
- 充值页：`src/pages/package-points/index.vue`
- 三角色后台：`src/pages/credits-admin/index.vue`

## 11. 对“数据库是否完成”的建议回答

建议直接这样说明：

```text
当前积分/计费集成 MVP 所需的数据库工作已经完成。

Reusable Credits Platform 是用户、租户、积分账户、充值产品、支付订单、计费任务、冻结锁和不可变积分流水的事实来源。usedCarPlatform 只保存本地业务任务数据，以及 credits_user_id、billing_task_id、billing_status、estimated_points、settled_points 等计费追踪字段。

我们可以通过运行两个项目的 migrations、执行 npm run phase11:smoke，并在两个数据库中查看对应数据来证明：usedCar 的 generation_tasks/batch_tasks 中有计费引用，Reusable Credits Platform 的 billing_tasks/credit_transactions 中有事实来源计费和流水记录。

三角色后台 UI 也已经完成，可用于评审；但部分运营后台数据库/API，例如代理商线索、结算账单、工单支持、生产级 CRUD 审批等，属于计费 MVP 之外的后续工作。
```

## 12. 已知限制

- usedCar 登录仍然是 mock auth。
- 生产环境需要从真实 usedCar session/auth 数据中解析积分身份。
- 租户成员校验还不是最终版本。
- 支付 provider callback 和实际付款到账结算在 Reusable Credits Platform 侧覆盖；usedCar 当前通过代理创建 pending 支付订单。
- Phase 11 smoke runner 不调用真实 KIE。
- 三角色后台的高风险写操作需通过角色权限、审计 API 和工作流接口开放；积分增减必须走追加式审计流水，不能直接改余额。
