# Frontend API Endpoints

This document is for frontend integration on the `feature` branch.

## Local Services

| Service | Base URL | Purpose |
| --- | --- | --- |
| Frontend | `http://127.0.0.1:5173` | Vite app |
| usedCar backend | `http://127.0.0.1:3101` | Frontend should call this service |
| Reusable Credits Platform | `http://127.0.0.1:3000` | Credits/payment service; normally called through usedCar backend proxy |

Frontend API base URL:

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3101/api/v1";
```

## Common Rules

### Response Envelope

Most usedCar backend endpoints return:

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "requestId": "req_xxx"
}
```

Use `data` as the real payload.

### Credits Identity Headers

Generation and credits-related requests need credits identity headers. The current frontend injects these in `src/api/http.ts`.

```http
x-credits-user-id: 4
x-credits-account-scope: personal
```

For tenant account testing:

```http
x-credits-user-id: 4
x-credits-account-scope: tenant
x-credits-tenant-id: 1
```

The backend also accepts these fields in the JSON body:

```json
{
  "creditsUserId": 4,
  "accountScope": "personal",
  "creditsTenantId": 1
}
```

### Static Files

The backend exposes uploaded/generated files directly:

| URL | Meaning |
| --- | --- |
| `GET /uploads/<file>` | Uploaded assets |
| `GET /results/<file>` | Generated images/videos |
| `GET /packages/<file>` | Delivery zip packages |

## Health

### usedCar Backend

```http
GET http://127.0.0.1:3101/health
```

Response:

```json
{ "ok": true }
```

### Credits Platform

```http
GET http://127.0.0.1:3000/health
GET http://127.0.0.1:3000/health/db
```

Response:

```json
{ "status": "ok" }
```

## Assets

### Upload Asset

```http
POST /api/v1/assets/upload
Content-Type: multipart/form-data
```

Form fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `file` | file | yes | Image file |
| `purpose` | string | yes | `car_exterior`, `car_interior`, or `logo` |

Response `data`:

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

## User Logo

### Get Default Logo

```http
GET /api/v1/user/logo
```

Response `data` is either `null` or:

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

### Replace Default Logo

```http
POST /api/v1/user/logo
Content-Type: multipart/form-data
```

Form fields:

| Field | Type | Required |
| --- | --- | --- |
| `file` | file | yes |

## Generation Modules

### Shared Single-Image Generation Endpoint

Most visual modules use:

```http
POST /api/v1/modules/{moduleCode}/tasks
```

Supported `moduleCode` values:

| Module | UI Name | Notes |
| --- | --- | --- |
| `showroom-light` | 展厅棚拍 | Scene generation |
| `outdoor-scene` | 户外实景 | Scene generation |
| `road-motion` | 行驶动效 | Scene generation |
| `sky-studio` | 天空影棚 | Scene generation |
| `paint-refresh` | 烤漆翻新 | Uses `colorCode` optionally |
| `light-consistency` | 光污美化 / 光污一致化 | Single image |
| `interior-clean` | 内饰清洁 | Uses car interior asset |
| `watermark-remove` | 去水印 | Beta feature |
| `short-video` | 短视频 | Uses video settings in `extra` |

Request body:

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

Common fields:

| Field | Required | Notes |
| --- | --- | --- |
| `inputAssetId` | yes | Uploaded asset id |
| `optionId` | scene modules only | Scene/template option id |
| `sceneReferenceImageUrl` | optional | If omitted, backend uses its local reference image |
| `useLogo` | optional | Scene modules can use recent logo |
| `logoAssetId` | optional | Specific logo asset |
| `colorCode` | optional | Paint refresh color |
| `outputRatio` | optional | `auto`, `1:1`, `3:4`, `4:3`, `9:16`, `16:9` |
| `resolution` | optional | `1K`, `2K`, `4K`; short video currently uses its own mapping |
| `extra.videoResolution` | short video | Current frontend sends `720p` |

Response `data`:

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

### Interior Collage

```http
POST /api/v1/modules/interior-collage/tasks
```

Request body:

```json
{
  "assetIds": ["asset_interior_1", "asset_interior_2"],
  "outputRatio": "1:1",
  "resolution": "2K"
}
```

Response `data`:

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

## Task Polling And Recent Tasks

### Get Task Detail

```http
GET /api/v1/tasks/{taskId}
```

This endpoint also refreshes task status from KIE when needed and finalizes billing on success/failure.

Response `data`:

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

Statuses:

```txt
waiting | queued | generating | success | fail | canceled
```

### List All Recent Tasks

```http
GET /api/v1/tasks?page=1&pageSize=20&moduleCode=showroom-light&status=success&scope=all
```

Query fields:

| Field | Required | Notes |
| --- | --- | --- |
| `page` | no | Default `1` |
| `pageSize` | no | Default `20` |
| `moduleCode` | no | Filter by module |
| `status` | no | Filter by status |
| `scope` | no | Current frontend may pass `all` |

### List Recent Tasks For One Module

```http
GET /api/v1/modules/{moduleCode}/recent-tasks?page=1&pageSize=20&status=success
```

Response `data`:

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

## Batch New

### List Presets

```http
GET /api/v1/modules/batch-new/presets
```

### Save Preset

```http
POST /api/v1/modules/batch-new/presets
```

Request body:

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

### Create Batch Task

```http
POST /api/v1/modules/batch-new/tasks
```

Request body:

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

Batch billing rule:

```txt
30 points per exterior/interior item
+10 if enableLightConsistency
+10 if enablePaintRefresh
```

Response `data`:

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

### List Batch Tasks

```http
GET /api/v1/modules/batch-new/tasks?page=1&pageSize=20&status=success
```

### Get Batch Detail

```http
GET /api/v1/modules/batch-new/tasks/{batchId}
```

## Delivery

### List Delivery Tasks

```http
GET /api/v1/modules/delivery/tasks?page=1&pageSize=20&status=success
```

### List Delivery Assets For Task

```http
GET /api/v1/modules/delivery/tasks/{taskId}/assets?ratio=1:1&page=1&pageSize=50
```

### Create Delivery Package

```http
POST /api/v1/modules/delivery/packages
```

Request body:

```json
{
  "taskId": "batch_xxx",
  "packageName": "delivery-assets.zip",
  "assetIds": ["asset_xxx"]
}
```

### List Delivery Packages

```http
GET /api/v1/modules/delivery/packages?taskId=batch_xxx
```

### Get Delivery Package

```http
GET /api/v1/modules/delivery/packages/{packageId}
```

### Delete Delivery Assets

```http
DELETE /api/v1/modules/delivery/assets
```

Request body:

```json
{ "assetIds": ["asset_xxx"] }
```

### Delete Delivery Tasks

```http
DELETE /api/v1/modules/delivery/tasks
```

Request body:

```json
{ "taskIds": ["batch_xxx"] }
```

## Creative Image

### Create Conversation

```http
POST /api/v1/modules/creative-image/conversations
```

Request body:

```json
{ "title": "新会话" }
```

### List Conversations

```http
GET /api/v1/modules/creative-image/conversations?page=1&pageSize=20
```

### Get Conversation

```http
GET /api/v1/modules/creative-image/conversations/{conversationId}
```

### List Messages

```http
GET /api/v1/modules/creative-image/conversations/{conversationId}/messages
```

### Upload Reference Asset

```http
POST /api/v1/modules/creative-image/conversations/{conversationId}/assets
Content-Type: multipart/form-data
```

Form fields:

| Field | Type | Required |
| --- | --- | --- |
| `file` | file | yes |
| `purpose` | string | yes, current frontend sends `car_exterior` |

### Create Creative Generation

```http
POST /api/v1/modules/creative-image/conversations/{conversationId}/generations
```

Request body:

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

## Credits Proxy Endpoints

Frontend should prefer these usedCar backend proxy endpoints over calling the credits service directly.

### Admin Overview

```http
GET /api/v1/credits/admin/overview
```

Uses credits identity headers. Response includes:

```json
{
  "application": {},
  "applicationFunctions": [],
  "creditAccounts": [],
  "rechargeProducts": [],
  "recentTransactions": []
}
```

### List Accounts

```http
GET /api/v1/credits/accounts
```

Response `data`:

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

### List Transactions

```http
GET /api/v1/credits/transactions?accountScope=personal&limit=50
GET /api/v1/credits/transactions?accountId=3&limit=50
GET /api/v1/credits/transactions?accountScope=tenant&tenantId=1&limit=50
```

Response `data`:

```json
{
  "account": {},
  "transactions": []
}
```

### List Recharge Products

```http
GET /api/v1/credits/recharge-products
```

### Create Payment Order

```http
POST /api/v1/credits/payment-orders
```

Request body:

```json
{
  "productId": 1,
  "payChannel": "card",
  "idempotencyKey": "payment_order:unique-client-key"
}
```

The proxy adds the current credits identity from headers/body.

## Direct Credits Platform Endpoints

These run on `http://127.0.0.1:3000`. The frontend usually should not call them directly unless working specifically on the payment/admin platform UI.

Swagger/OpenAPI:

```http
GET http://127.0.0.1:3000/docs
GET http://127.0.0.1:3000/openapi.json
```

### Billing Lifecycle

```http
POST /billing/estimate
POST /billing/freeze
POST /billing/settle
POST /billing/refund
GET  /billing/tasks/{billingTaskId}?userId=4
GET  /accounts/{accountId}/transactions?userId=4&limit=50
```

Estimate body:

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

Freeze/settle/refund body:

```json
{
  "userId": 4,
  "billingTaskId": 58,
  "idempotencyKey": "freeze:generation_task:task_xxx"
}
```

### Payments

```http
GET  /recharge-products
POST /payment-orders
GET  /payment-orders/{paymentOrderId}?userId=4
POST /payment-callbacks/{channel}
```

Create order body:

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

Payment callback is for payment-provider simulation/backend use:

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

### Integration Registry

```http
GET  /integration/contract
GET  /integration/applications
POST /integration/applications
GET  /integration/applications/{applicationCode}/functions
POST /integration/applications/{applicationCode}/functions
```

### Accounts, Tenants, Agents

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

## Current Deduction Rules

| Function | Points |
| --- | ---: |
| Single image generation modules | `30` |
| Creative image | `30` |
| Short video | `4000` |
| Batch exterior/interior item baseline | `30` |
| Batch light consistency add-on | `+10` |
| Batch paint refresh add-on | `+10` |

Batch scene change, recent logo, and interior delivery options do not add extra points under the current rule set.

## Current Demo Account IDs

The seeded local credits DB currently has:

| Meaning | User/Tenant | Scope | Account |
| --- | --- | --- | --- |
| Basic/demo personal user | `userId=4` | `personal` | Account id usually `3` |
| Demo tenant/team account | `tenantId=1` | `tenant` | Account id usually `4` |

Always use headers/body identity instead of hard-coding account ids in UI logic. Account ids can change if the DB is reseeded.
