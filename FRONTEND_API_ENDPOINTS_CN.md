# 前端 API 接口文档

本文档用于 `feature` 分支的前端联调。

## 本地服务地址

| 服务 | 地址 | 用途 |
| --- | --- | --- |
| 前端 | `http://127.0.0.1:5173` | Vite 前端页面 |
| usedCar 后端 | `http://127.0.0.1:3101` | 前端主要调用这个服务 |
| Reusable Credits Platform | `http://127.0.0.1:3000` | 积分/支付服务，通常通过 usedCar 后端代理调用 |

前端 API 默认地址：

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3101/api/v1";
```

## 通用规则

### 返回格式

usedCar 后端大多数接口返回：

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "requestId": "req_xxx"
}
```

前端业务数据从 `data` 中读取。

### 积分身份 Header

生成任务、积分查询、支付相关请求需要携带积分身份。当前前端在 `src/api/http.ts` 中自动注入。

个人账户测试：

```http
x-credits-user-id: 4
x-credits-account-scope: personal
```

企业/团队账户测试：

```http
x-credits-user-id: 4
x-credits-account-scope: tenant
x-credits-tenant-id: 1
```

后端也支持在 JSON body 中传入身份字段：

```json
{
  "creditsUserId": 4,
  "accountScope": "personal",
  "creditsTenantId": 1
}
```

### 静态文件地址

后端直接暴露上传文件和生成结果：

| 地址 | 含义 |
| --- | --- |
| `GET /uploads/<file>` | 用户上传图片 |
| `GET /results/<file>` | AI 生成图片/视频 |
| `GET /packages/<file>` | 交付压缩包 |

## 健康检查

### usedCar 后端

```http
GET http://127.0.0.1:3101/health
```

返回：

```json
{ "ok": true }
```

### 积分平台

```http
GET http://127.0.0.1:3000/health
GET http://127.0.0.1:3000/health/db
```

返回：

```json
{ "status": "ok" }
```

## 素材上传

### 上传素材

```http
POST /api/v1/assets/upload
Content-Type: multipart/form-data
```

表单字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `file` | file | 是 | 图片文件 |
| `purpose` | string | 是 | `car_exterior`、`car_interior`、`logo` |

返回 `data`：

```json
{
  "assetId": "asset_xxx",
  "purpose": "car_exterior",
  "url": "http://localhost:3101/uploads/upload_xxx.jpg",
  "fileName": "car.jpg",
  "mimeType": "image/jpeg",
  "size": 123456
}
```

## 默认 Logo

### 获取默认 Logo

```http
GET /api/v1/user/logo
```

返回 `data` 可能是 `null`，也可能是：

```json
{
  "userId": "default",
  "logoAssetId": "asset_xxx",
  "logo": {
    "assetId": "asset_xxx",
    "purpose": "logo",
    "url": "http://localhost:3101/uploads/upload_xxx.png",
    "fileName": "logo.png",
    "mimeType": "image/png",
    "size": 12345
  },
  "updatedAt": "2026-06-02T00:00:00.000Z"
}
```

### 替换默认 Logo

```http
POST /api/v1/user/logo
Content-Type: multipart/form-data
```

表单字段：

| 字段 | 类型 | 必填 |
| --- | --- | --- |
| `file` | file | 是 |

## 生成类模块

### 通用单图生成接口

大多数视觉功能都调用：

```http
POST /api/v1/modules/{moduleCode}/tasks
```

支持的 `moduleCode`：

| 模块 | 页面名称 | 说明 |
| --- | --- | --- |
| `showroom-light` | 展厅棚拍 | 场景更换 |
| `outdoor-scene` | 户外实景 | 场景更换 |
| `road-motion` | 行驶动效 | 场景更换 |
| `sky-studio` | 天空影棚 | 场景更换 |
| `paint-refresh` | 烤漆翻新 | 可传 `colorCode` |
| `light-consistency` | 光污美化 / 光污一致化 | 单图生成 |
| `interior-clean` | 内饰清洁 | 使用内饰图 |
| `watermark-remove` | 去水印 | Beta 功能 |
| `short-video` | 短视频 | 视频生成，参数在 `extra` 中 |

请求 body：

```json
{
  "inputAssetId": "asset_xxx",
  "optionId": "white-studio",
  "sceneReferenceImageUrl": "https://example.com/scene.png",
  "useLogo": false,
  "logoAssetId": "asset_logo_xxx",
  "colorCode": "#ffffff",
  "outputRatio": "1:1",
  "resolution": "2K",
  "extra": {
    "videoResolution": "720p"
  }
}
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `inputAssetId` | 是 | 上传素材 id |
| `optionId` | 场景模块需要 | 场景/模板 id |
| `sceneReferenceImageUrl` | 否 | 不传时，后端使用本地场景参考图 |
| `useLogo` | 否 | 场景模块是否使用最近 Logo |
| `logoAssetId` | 否 | 指定 Logo 素材 |
| `colorCode` | 否 | 烤漆翻新颜色 |
| `outputRatio` | 否 | `auto`、`1:1`、`3:4`、`4:3`、`9:16`、`16:9` |
| `resolution` | 否 | `1K`、`2K`、`4K` |
| `extra.videoResolution` | 短视频需要 | 当前前端发送 `720p` |

返回 `data`：

```json
{
  "taskId": "task_xxx",
  "moduleCode": "showroom-light",
  "status": "queued",
  "progress": 5,
  "kieTaskId": "kie_xxx",
  "optionId": "white-studio",
  "sceneTitle": "经典白棚",
  "sceneReferenceImageUrl": "https://...",
  "logoAssetId": null,
  "inputImageCount": 2,
  "billingTaskId": 58,
  "billingStatus": "frozen",
  "estimatedCost": 30,
  "estimatedPoints": "30.0000",
  "pollingUrl": "/api/v1/tasks/task_xxx",
  "createdAt": "2026-06-02T00:00:00.000Z"
}
```

### 内饰拼图

```http
POST /api/v1/modules/interior-collage/tasks
```

请求 body：

```json
{
  "assetIds": ["asset_interior_1", "asset_interior_2"],
  "outputRatio": "1:1",
  "resolution": "2K"
}
```

返回 `data`：

```json
{
  "moduleCode": "interior-collage",
  "status": "queued",
  "inputImageCount": 2,
  "outputCount": 1,
  "groups": [
    {
      "groupIndex": 1,
      "inputAssetIds": ["asset_interior_1", "asset_interior_2"],
      "inputImageCount": 2
    }
  ],
  "tasks": [
    {
      "taskId": "task_xxx",
      "moduleCode": "interior-collage",
      "status": "queued",
      "progress": 5,
      "pollingUrl": "/api/v1/tasks/task_xxx"
    }
  ],
  "createdAt": "2026-06-02T00:00:00.000Z"
}
```

## 任务轮询与最近任务

### 获取任务详情

```http
GET /api/v1/tasks/{taskId}
```

这个接口会在必要时从 KIE 刷新任务状态，并在成功/失败时结算或退还积分。

返回 `data`：

```json
{
  "taskId": "task_xxx",
  "moduleCode": "showroom-light",
  "status": "success",
  "progress": 100,
  "kieTaskId": "kie_xxx",
  "inputAssetId": "asset_xxx",
  "optionId": "white-studio",
  "outputRatio": "1:1",
  "resolution": "2K",
  "resultImages": [
    {
      "url": "http://localhost:3101/results/showroom-light/result.png",
      "sourceUrl": "https://...",
      "contentType": "image/png",
      "size": 123456
    }
  ],
  "resultVideos": [],
  "videoUrl": null,
  "downloadUrl": "http://localhost:3101/results/showroom-light/result.png",
  "billingTaskId": 58,
  "billingStatus": "settled",
  "estimatedPoints": "30.0000",
  "settledPoints": "30.0000",
  "error": null,
  "createdAt": "2026-06-02T00:00:00.000Z",
  "updatedAt": "2026-06-02T00:00:00.000Z"
}
```

任务状态：

```txt
waiting | queued | generating | success | fail | canceled
```

### 查询最近任务

全部任务：

```http
GET /api/v1/tasks?page=1&pageSize=20&moduleCode=showroom-light&status=success&scope=all
```

单模块任务：

```http
GET /api/v1/modules/{moduleCode}/recent-tasks?page=1&pageSize=20&status=success
```

查询参数：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `page` | 否 | 默认 `1` |
| `pageSize` | 否 | 默认 `20` |
| `moduleCode` | 否 | 按模块过滤 |
| `status` | 否 | 按状态过滤 |
| `scope` | 否 | 当前前端可能传 `all` |

返回 `data`：

```json
{
  "items": [
    {
      "id": "task_xxx",
      "taskId": "task_xxx",
      "moduleCode": "showroom-light",
      "title": "展厅灯光生成任务",
      "status": "success",
      "uiStatus": "success",
      "progress": 100,
      "thumbnail": "http://localhost:3101/results/...",
      "previewImage": "http://localhost:3101/results/...",
      "downloadUrl": "http://localhost:3101/results/...",
      "ratioLabel": "主图 1:1",
      "sceneLabel": "white-studio",
      "outputRatio": "1:1",
      "inputAssetId": "asset_xxx",
      "inputAssetUrl": "http://localhost:3101/uploads/...",
      "resultCount": 1,
      "error": null,
      "createdAt": "2026-06-02T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

## 批量上新

### 查询预设

```http
GET /api/v1/modules/batch-new/presets
```

### 保存预设

```http
POST /api/v1/modules/batch-new/presets
```

请求 body：

```json
{
  "presetId": "preset_xxx",
  "name": "展厅批量上新",
  "visualConfig": {
    "enableSceneChange": true,
    "sceneOptionId": "white-studio",
    "sceneReferenceImageUrl": "https://...",
    "sceneIndex": 0,
    "sceneCategory": "展厅灯光",
    "outputRatio": "1:1",
    "useRecentLogo": false,
    "enableLightConsistency": false,
    "enablePaintRefresh": false,
    "colorCode": null,
    "enableInteriorClean": false,
    "enableInteriorCollage": false
  }
}
```

### 创建批量任务

```http
POST /api/v1/modules/batch-new/tasks
```

请求 body：

```json
{
  "projectName": "6月批量上新",
  "presetId": "preset_xxx",
  "carGroups": [
    {
      "groupTitle": "车辆 1",
      "exteriorAssetIds": ["asset_exterior_1"],
      "interiorAssetIds": ["asset_interior_1", "asset_interior_2"]
    }
  ],
  "visualConfig": {
    "enableSceneChange": true,
    "sceneOptionId": "white-studio",
    "sceneReferenceImageUrl": "https://...",
    "sceneIndex": 0,
    "sceneCategory": "展厅灯光",
    "outputRatio": "1:1",
    "useRecentLogo": false,
    "enableLightConsistency": true,
    "enablePaintRefresh": false,
    "colorCode": null,
    "enableInteriorClean": false,
    "enableInteriorCollage": false
  },
  "outputRatio": "1:1"
}
```

批量扣费规则：

```txt
每个外观/内饰生成 item 基础 30 积分
enableLightConsistency = true 时 +10
enablePaintRefresh = true 时 +10
```

返回 `data`：

```json
{
  "batchId": "batch_xxx",
  "projectName": "6月批量上新",
  "status": "queued",
  "total": 1,
  "completed": 0,
  "failed": 0,
  "progress": 0,
  "pollingUrl": "/api/v1/modules/batch-new/tasks/batch_xxx",
  "estimatedCost": 40,
  "balance": 1250,
  "createdAt": "2026-06-02T00:00:00.000Z"
}
```

### 查询批量任务列表

```http
GET /api/v1/modules/batch-new/tasks?page=1&pageSize=20&status=success
```

### 查询批量任务详情

```http
GET /api/v1/modules/batch-new/tasks/{batchId}
```

## 成片交付

### 查询交付任务

```http
GET /api/v1/modules/delivery/tasks?page=1&pageSize=20&status=success
```

### 查询某任务下的交付素材

```http
GET /api/v1/modules/delivery/tasks/{taskId}/assets?ratio=1:1&page=1&pageSize=50
```

### 创建交付压缩包

```http
POST /api/v1/modules/delivery/packages
```

请求 body：

```json
{
  "taskId": "batch_xxx",
  "packageName": "delivery-assets.zip",
  "assetIds": ["asset_xxx"]
}
```

### 查询压缩包列表

```http
GET /api/v1/modules/delivery/packages?taskId=batch_xxx
```

### 查询压缩包详情

```http
GET /api/v1/modules/delivery/packages/{packageId}
```

### 删除交付素材

```http
DELETE /api/v1/modules/delivery/assets
```

请求 body：

```json
{ "assetIds": ["asset_xxx"] }
```

### 删除交付任务

```http
DELETE /api/v1/modules/delivery/tasks
```

请求 body：

```json
{ "taskIds": ["batch_xxx"] }
```

## 创意生图

### 创建会话

```http
POST /api/v1/modules/creative-image/conversations
```

请求 body：

```json
{ "title": "新会话" }
```

### 查询会话列表

```http
GET /api/v1/modules/creative-image/conversations?page=1&pageSize=20
```

### 查询会话详情

```http
GET /api/v1/modules/creative-image/conversations/{conversationId}
```

### 查询消息列表

```http
GET /api/v1/modules/creative-image/conversations/{conversationId}/messages
```

### 上传参考图

```http
POST /api/v1/modules/creative-image/conversations/{conversationId}/assets
Content-Type: multipart/form-data
```

表单字段：

| 字段 | 类型 | 必填 |
| --- | --- | --- |
| `file` | file | 是 |
| `purpose` | string | 是，当前前端发送 `car_exterior` |

### 创建创意生成任务

```http
POST /api/v1/modules/creative-image/conversations/{conversationId}/generations
```

请求 body：

```json
{
  "prompt": "生成一张汽车电商主图",
  "referenceAssetId": "asset_xxx",
  "useLastReference": false,
  "sourceTaskId": "task_xxx",
  "sourceImageUrl": "http://localhost:3101/results/...",
  "outputRatio": "1:1",
  "resolution": "2K"
}
```

## 积分代理接口

前端优先调用 usedCar 后端的积分代理接口，不建议直接调积分平台，除非正在开发支付/积分管理页面。

### 积分管理概览

```http
GET /api/v1/credits/admin/overview
```

使用积分身份 headers。返回包含：

```json
{
  "application": {},
  "applicationFunctions": [],
  "creditAccounts": [],
  "rechargeProducts": [],
  "recentTransactions": []
}
```

### 查询账户

```http
GET /api/v1/credits/accounts
```

返回 `data`：

```json
{
  "accounts": [
    {
      "id": 3,
      "tenantId": null,
      "userId": 4,
      "accountScope": "personal",
      "totalBalance": "1250.0000",
      "lockedBalance": "0.0000",
      "availableBalance": "1250.0000",
      "currency": "credits",
      "status": "active"
    }
  ]
}
```

### 查询积分流水

```http
GET /api/v1/credits/transactions?accountScope=personal&limit=50
GET /api/v1/credits/transactions?accountId=3&limit=50
GET /api/v1/credits/transactions?accountScope=tenant&tenantId=1&limit=50
```

返回 `data`：

```json
{
  "account": {},
  "transactions": []
}
```

### 查询充值套餐

```http
GET /api/v1/credits/recharge-products
```

### 创建支付订单

```http
POST /api/v1/credits/payment-orders
```

请求 body：

```json
{
  "productId": 1,
  "payChannel": "card",
  "idempotencyKey": "payment_order:unique-client-key"
}
```

代理接口会从 headers/body 中补齐当前积分身份。

## 直接调用积分平台接口

积分平台运行在 `http://127.0.0.1:3000`。前端通常不需要直接调用，除非正在做支付模块或积分平台管理 UI。

Swagger/OpenAPI：

```http
GET http://127.0.0.1:3000/docs
GET http://127.0.0.1:3000/openapi.json
```

### 扣费生命周期

```http
POST /billing/estimate
POST /billing/freeze
POST /billing/settle
POST /billing/refund
GET  /billing/tasks/{billingTaskId}?userId=4
GET  /accounts/{accountId}/transactions?userId=4&limit=50
```

estimate 请求 body：

```json
{
  "userId": 4,
  "accountScope": "personal",
  "tenantId": 1,
  "applicationCode": "used-car-platform",
  "functionCode": "showroom-light",
  "estimatedPoints": "30.0000",
  "bizType": "generation_task",
  "bizId": "task_xxx",
  "idempotencyKey": "estimate:generation_task:task_xxx"
}
```

freeze/settle/refund 请求 body：

```json
{
  "userId": 4,
  "billingTaskId": 58,
  "idempotencyKey": "freeze:generation_task:task_xxx"
}
```

### 支付

```http
GET  /recharge-products
POST /payment-orders
GET  /payment-orders/{paymentOrderId}?userId=4
POST /payment-callbacks/{channel}
```

创建订单 body：

```json
{
  "userId": 4,
  "accountScope": "personal",
  "tenantId": 1,
  "productId": 1,
  "payChannel": "card",
  "idempotencyKey": "payment_order:unique-client-key"
}
```

支付回调主要用于支付服务/后端模拟，不建议普通前端页面直接调用：

```json
{
  "orderNo": "ORDER_xxx",
  "notifyId": "notify_xxx",
  "providerStatus": "paid",
  "rawData": {
    "orderNo": "ORDER_xxx"
  },
  "sign": "signature",
  "idempotencyKey": "callback:unique-key"
}
```

### 应用和计费函数注册

```http
GET  /integration/contract
GET  /integration/applications
POST /integration/applications
GET  /integration/applications/{applicationCode}/functions
POST /integration/applications/{applicationCode}/functions
```

### 账户、租户、代理

```http
GET   /me/accounts?userId=4
GET   /tenants/{tenantId}/accounts?currentUserId=4
GET   /tenants/{tenantId}/transactions?currentUserId=4&limit=50
GET   /tenants/{tenantId}/members?currentUserId=4
POST  /tenants/{tenantId}/members
PATCH /tenant-members/{memberId}/status

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

## 当前扣费规则

| 功能 | 积分 |
| --- | ---: |
| 单图生成类模块 | `30` |
| 创意生图 | `30` |
| 短视频 | `4000` |
| 批量外观/内饰 item 基础价 | `30` |
| 批量光污一致化加项 | `+10` |
| 批量烤漆翻新加项 | `+10` |

当前规则下，批量场景更换、最近 Logo、内饰交付选项不额外加积分。

## 当前本地 Demo 身份

本地 seed 后的积分账户通常是：

| 含义 | User/Tenant | Scope | Account |
| --- | --- | --- | --- |
| Demo 个人用户 | `userId=4` | `personal` | 账户 id 通常是 `3` |
| Demo 企业/团队账户 | `tenantId=1` | `tenant` | 账户 id 通常是 `4` |

前端逻辑不要硬编码账户 id。数据库重新 seed 后，账户 id 可能变化。优先通过身份 headers 查询 `/api/v1/credits/accounts`。
