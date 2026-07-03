# Vehicle Library Database Specification And Build Plan

Status: draft for implementation
Date: 2026-07-03
Working branch: `test`
Source inputs:

- `/Users/shenghangwang/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_3obs0g6rfyox22_3bea/temp/drag/vehicle-library-schema.sql`
- `/Users/shenghangwang/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_3obs0g6rfyox22_3bea/temp/drag/vehicle-library-data-contract.md`

Scope decision: implement source sections 1-5 only. Ignore source sections 6 and 7, meaning no `vehicle_video_projects` table, no `vehicle_video_project_materials` table, and no generation-project persistence in this phase.

## Product Goal

Build a reusable vehicle library for usedCarPlatform so each authenticated user can save car profile data, VIN information, car pictures, car videos, and optional lot/dealership media once, then reuse those records in later generation workflows instead of uploading the same car information every time.

The first implementation must solve persistence and retrieval. Video generation integration can consume saved vehicles later, but the first database pass should not couple the vehicle library to the current video-generation task model.

## In Scope

- One or more vehicle libraries owned by an app user and optionally attached to an enterprise tenant.
- Lot/dealership records with one required image slot and one required video slot.
- Vehicle records with normalized structured vehicle fields and optional VIN.
- Fixed material slots for vehicle and lot media.
- Material records that reference the existing `assets` table instead of storing file blobs or paths again.
- VIN recognition records for both text VIN and VIN image workflows.
- CRUD/list APIs needed by frontend forms and future generation prefill.
- Contract tests for slot validation, ownership checks, VIN normalization, and completeness updates.

## Out Of Scope

- Tables 6 and 7 from the source documents.
- Persisting video-generation projects, generation config snapshots, selected digital humans, templates, voices, output ratios, or generated result assets inside the vehicle library.
- Replacing the current `assets` table or upload endpoint.
- Complex inventory finance, valuation, sales leads, or approval workflows.
- Complex enterprise org permissions beyond current authenticated user and tenant membership data.
- Multiple material versions per slot. Replacing a slot updates the same logical slot.

## Repo Fit

Current backend shape:

- Express app entry: `backend/src/app.ts`
- MySQL pool: `backend/src/db/mysql.ts`
- Base migration DDL: `backend/src/db/migrations.ts`
- Idempotent migration repair/backfill runner: `backend/src/db/migrate.ts`
- Existing upload API: `POST /api/v1/assets/upload`
- Existing asset table: `assets`
- Authenticated routes use `requireCurrentUser` and `getRequiredCurrentUser`.
- Current user type includes `id`, `enterpriseTenantId`, `accountScope`, and enterprise membership fields.

The vehicle library should be added as a new backend module:

```text
backend/src/modules/vehicle-library/
+-- vehicleLibraryRoutes.ts
+-- vehicleLibraryService.ts
+-- vehicleLibraryRepository.ts
+-- vehicleLibraryTypes.ts
+-- vehicleLibraryContract.test.ts
```

Mount path:

```ts
app.use("/api/v1/vehicle-library", requireCurrentUser, vehicleLibraryRoutes);
```

## Database Contract

All IDs use the repo's existing app-layer ID pattern from `createId(prefix)`, stored as `VARCHAR(64)`.

The first pass may follow the source SQL's "indexes first, application-enforced relations" rule. Foreign keys may be added later after the team confirms all existing data is clean. Application code must still validate ownership and existence before writes.

### `vehicle_libraries`

Purpose: top-level saved vehicle workspace for a user or enterprise tenant.

Required fields:

| Field | Type | Rule |
| --- | --- | --- |
| `id` | `VARCHAR(64)` | primary key |
| `tenant_id` | `VARCHAR(64) NULL` | current user's `enterpriseTenantId` when using tenant scope |
| `owner_user_id` | `VARCHAR(64)` | creator/opening user |
| `name` | `VARCHAR(100)` | default `Vehicle Library` |
| `status` | `VARCHAR(20)` | `active`, `frozen`, `disabled` |
| `quota_bytes` | `BIGINT UNSIGNED` | `0` means unlimited |
| `used_bytes` | `BIGINT UNSIGNED` | sum of linked active material sizes |
| `remark` | `VARCHAR(500) NULL` | optional |
| `created_at` / `updated_at` | `DATETIME(3)` | China-time MySQL pool handles app timezone |

Indexes:

- `idx_vehicle_libraries_tenant (tenant_id)`
- `idx_vehicle_libraries_owner (owner_user_id)`
- `idx_vehicle_libraries_status (status)`

### `vehicle_lots`

Purpose: saved dealership/lot profile and its required environment media.

Required fields:

| Field | Type | Rule |
| --- | --- | --- |
| `id` | `VARCHAR(64)` | primary key |
| `library_id` | `VARCHAR(64)` | parent library |
| `name` | `VARCHAR(100)` | lot/dealership name |
| `address` | `VARCHAR(255) NULL` | optional |
| `remark` | `VARCHAR(500) NULL` | optional |
| `material_status` | `VARCHAR(20)` | `incomplete`, `complete` |
| `status` | `VARCHAR(20)` | `active`, `archived` |
| `created_by_user_id` | `VARCHAR(64)` | creator |
| `updated_by_user_id` | `VARCHAR(64) NULL` | last editor |
| `deleted_at` | `DATETIME(3) NULL` | soft delete |
| `created_at` / `updated_at` | `DATETIME(3)` | timestamps |

Indexes:

- `idx_vehicle_lots_library_status (library_id, status)`
- `idx_vehicle_lots_material_status (library_id, material_status)`
- `idx_vehicle_lots_created_at (created_at)`

### `vehicles`

Purpose: saved vehicle profile, optional VIN, marketable fields, and material completeness.

Required fields:

| Field | Type | Rule |
| --- | --- | --- |
| `id` | `VARCHAR(64)` | primary key |
| `library_id` | `VARCHAR(64)` | parent library |
| `lot_id` | `VARCHAR(64) NULL` | optional parent lot |
| `vin` | `CHAR(17) NULL` | uppercase VIN; null allowed for manual entry |
| `identify_type` | `VARCHAR(20)` | `manual`, `vin_text`, `vin_image` |
| `brand` | `VARCHAR(80)` | required |
| `series` | `VARCHAR(120)` | required |
| `model` | `VARCHAR(160) NULL` | optional |
| `model_year` | `VARCHAR(20) NULL` | optional |
| `energy_type` | `VARCHAR(40) NULL` | optional |
| `displacement` | `VARCHAR(40) NULL` | optional |
| `transmission` | `VARCHAR(40) NULL` | optional |
| `vehicle_level` | `VARCHAR(40) NULL` | optional |
| `color` | `VARCHAR(40) NULL` | optional |
| `mileage_km` | `INT UNSIGNED NULL` | optional |
| `first_registration_date` | `DATE NULL` | optional |
| `guide_price` | `DECIMAL(12,2) NULL` | optional |
| `sale_price` | `DECIMAL(12,2) NULL` | optional |
| `remark` | `VARCHAR(500) NULL` | selling points or notes |
| `material_status` | `VARCHAR(20)` | `incomplete`, `complete` |
| `status` | `VARCHAR(20)` | `active`, `sold`, `archived` |
| `last_generated_at` | `DATETIME(3) NULL` | keep for future generation integration |
| `created_by_user_id` | `VARCHAR(64)` | creator |
| `updated_by_user_id` | `VARCHAR(64) NULL` | last editor |
| `deleted_at` | `DATETIME(3) NULL` | soft delete |
| `created_at` / `updated_at` | `DATETIME(3)` | timestamps |

Indexes:

- `uk_vehicles_library_vin (library_id, vin)`
- `idx_vehicles_library_status (library_id, status)`
- `idx_vehicles_lot (lot_id)`
- `idx_vehicles_brand_series (library_id, brand, series)`
- `idx_vehicles_material_status (library_id, material_status)`
- `idx_vehicles_created_at (created_at)`

VIN rule: MySQL allows multiple `NULL` values in a unique key, so manual vehicles without VIN can coexist. Non-null VINs must be unique within the same library.

### `vehicle_library_materials`

Purpose: link existing uploaded assets to fixed vehicle or lot material slots.

Required fields:

| Field | Type | Rule |
| --- | --- | --- |
| `id` | `VARCHAR(64)` | primary key |
| `library_id` | `VARCHAR(64)` | parent library |
| `owner_type` | `VARCHAR(20)` | `vehicle` or `lot` |
| `owner_id` | `VARCHAR(64)` | vehicle ID or lot ID |
| `asset_id` | `VARCHAR(64)` | existing `assets.id` |
| `slot_code` | `VARCHAR(40)` | one fixed slot below |
| `media_type` | `VARCHAR(20)` | `image` or `video` |
| `file_name` | `VARCHAR(255) NULL` | copied from `assets` for display |
| `file_size` | `BIGINT UNSIGNED NULL` | copied from `assets.size` |
| `duration_seconds` | `DECIMAL(10,2) NULL` | future video metadata |
| `width` / `height` | `INT UNSIGNED NULL` | copied from asset when present |
| `is_required` | `TINYINT(1)` | fixed by slot definition |
| `is_cover` | `TINYINT(1)` | one cover per owner preferred |
| `sort_order` | `INT` | fixed by slot definition |
| `status` | `VARCHAR(20)` | `active`, `processing`, `failed`, `deleted` |
| `audit_status` | `VARCHAR(20)` | `pending`, `passed`, `rejected` |
| `metadata_json` | `JSON NULL` | future recognition/audit data |
| `created_by_user_id` | `VARCHAR(64)` | uploader/linking user |
| `deleted_at` | `DATETIME(3) NULL` | soft delete |
| `created_at` / `updated_at` | `DATETIME(3)` | timestamps |

Indexes:

- `uk_vehicle_library_material_slot (owner_type, owner_id, slot_code)`
- `idx_vehicle_library_materials_library (library_id)`
- `idx_vehicle_library_materials_owner (owner_type, owner_id)`
- `idx_vehicle_library_materials_asset (asset_id)`
- `idx_vehicle_library_materials_status (status, audit_status)`

Slot replacement rule: because the unique key is per owner and slot, replacing a material should update the existing slot row instead of inserting a second row.

### `vehicle_recognition_records`

Purpose: keep VIN text or VIN image recognition input, output, provider response, and errors.

Required fields:

| Field | Type | Rule |
| --- | --- | --- |
| `id` | `VARCHAR(64)` | primary key |
| `library_id` | `VARCHAR(64)` | parent library |
| `vehicle_id` | `VARCHAR(64) NULL` | optional vehicle link |
| `recognition_type` | `VARCHAR(20)` | `vin_text` or `vin_image` |
| `input_vin` | `VARCHAR(32) NULL` | raw input |
| `source_asset_id` | `VARCHAR(64) NULL` | VIN image asset |
| `recognized_vin` | `CHAR(17) NULL` | normalized VIN |
| `provider_code` | `VARCHAR(50) NULL` | provider identifier |
| `confidence` | `DECIMAL(5,4) NULL` | `0` to `1` |
| `status` | `VARCHAR(20)` | `pending`, `success`, `failed` |
| `result_json` | `JSON NULL` | raw provider payload |
| `error_code` | `VARCHAR(100) NULL` | provider/app error |
| `error_message` | `VARCHAR(500) NULL` | readable error |
| `created_by_user_id` | `VARCHAR(64)` | operator |
| `created_at` | `DATETIME(3)` | timestamp |

Indexes:

- `idx_vehicle_recognition_library (library_id, created_at)`
- `idx_vehicle_recognition_vehicle (vehicle_id)`
- `idx_vehicle_recognition_vin (recognized_vin)`
- `idx_vehicle_recognition_status (status)`

## Fixed Material Slots

Vehicle slots:

| Slot | Media | Required | Sort | Cover |
| --- | --- | ---: | ---: | ---: |
| `front_image` | `image` | yes | 10 | yes |
| `rear_image` | `image` | yes | 20 | no |
| `driver_image` | `image` | yes | 30 | no |
| `front_row_video` | `video` | yes | 40 | no |
| `rear_row_video` | `video` | yes | 50 | no |

Lot slots:

| Slot | Media | Required | Sort | Cover |
| --- | --- | ---: | ---: | ---: |
| `lot_image` | `image` | yes | 10 | yes |
| `lot_video` | `video` | yes | 20 | no |

Completeness rule: an owner is `complete` when every required slot for that owner type has one non-deleted material row with `status = active` and `audit_status != rejected`. The first pass should not require `audit_status = passed`, because no moderation workflow currently marks assets as passed.

## Service Rules

- Every endpoint requires current login.
- The service must create or return a default active library for the current user when the frontend first opens the vehicle library.
- Tenant scope is allowed only when the current session has `enterpriseTenantId`; otherwise `tenant_id` must be `NULL`.
- `owner_user_id` is always the user who opened or created the library.
- `brand` and `series` are required for vehicles.
- VIN is optional. If present, trim, uppercase, and validate as 17 characters excluding `I`, `O`, and `Q`.
- A vehicle's `lot_id`, when provided, must belong to the same `library_id`.
- Material `asset_id` must exist in `assets` and belong to the current user before linking.
- Image slots must link image assets. Video slots must link video assets. Use `mime_type` first; fall back to `purpose` only if needed.
- Replacing a material slot should recalculate `vehicle_libraries.used_bytes` and owner `material_status`.
- Soft delete records by setting `deleted_at` and an archived/deleted status; do not physically delete vehicle, lot, or material rows in the first pass.

## API Contract

Base path:

```text
/api/v1/vehicle-library
```

Response envelope follows the existing backend:

```ts
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  requestId: string;
}
```

### Library APIs

```http
GET /api/v1/vehicle-library/me
POST /api/v1/vehicle-library/libraries
PATCH /api/v1/vehicle-library/libraries/:libraryId
```

`GET /me` returns the active default library plus counts:

```ts
interface VehicleLibraryHome {
  library: VehicleLibrary;
  stats: {
    activeVehicles: number;
    completeVehicles: number;
    activeLots: number;
    usedBytes: number;
    quotaBytes: number;
  };
}
```

### Lot APIs

```http
GET /api/v1/vehicle-library/lots?page=1&pageSize=20&search=
POST /api/v1/vehicle-library/lots
GET /api/v1/vehicle-library/lots/:lotId
PATCH /api/v1/vehicle-library/lots/:lotId
DELETE /api/v1/vehicle-library/lots/:lotId
PUT /api/v1/vehicle-library/lots/:lotId/materials/:slotCode
DELETE /api/v1/vehicle-library/lots/:lotId/materials/:slotCode
```

Create lot request:

```ts
interface CreateVehicleLotRequest {
  libraryId?: string;
  name: string;
  address?: string | null;
  remark?: string | null;
}
```

Put lot material request:

```ts
interface PutVehicleLibraryMaterialRequest {
  assetId: string;
  metadata?: Record<string, unknown>;
}
```

### Vehicle APIs

```http
GET /api/v1/vehicle-library/vehicles?page=1&pageSize=20&search=&status=&materialStatus=&lotId=
POST /api/v1/vehicle-library/vehicles
GET /api/v1/vehicle-library/vehicles/:vehicleId
PATCH /api/v1/vehicle-library/vehicles/:vehicleId
DELETE /api/v1/vehicle-library/vehicles/:vehicleId
PUT /api/v1/vehicle-library/vehicles/:vehicleId/materials/:slotCode
DELETE /api/v1/vehicle-library/vehicles/:vehicleId/materials/:slotCode
```

Create vehicle request:

```ts
interface UpsertVehicleRequest {
  libraryId?: string;
  lotId?: string | null;
  vin?: string | null;
  identifyType?: "manual" | "vin_text" | "vin_image";
  brand: string;
  series: string;
  model?: string | null;
  modelYear?: string | null;
  energyType?: string | null;
  displacement?: string | null;
  transmission?: string | null;
  vehicleLevel?: string | null;
  color?: string | null;
  mileageKm?: number | null;
  firstRegistrationDate?: string | null;
  guidePrice?: string | number | null;
  salePrice?: string | number | null;
  remark?: string | null;
}
```

Vehicle list item:

```ts
interface VehicleListItem {
  id: string;
  libraryId: string;
  lotId?: string | null;
  lotName?: string | null;
  vin?: string | null;
  identifyType: "manual" | "vin_text" | "vin_image";
  brand: string;
  series: string;
  model?: string | null;
  modelYear?: string | null;
  color?: string | null;
  mileageKm?: number | null;
  salePrice?: string | null;
  materialStatus: "incomplete" | "complete";
  status: "active" | "sold" | "archived";
  coverAsset?: VehicleLibraryAssetSummary | null;
  createdAt: string;
  updatedAt: string;
}
```

### VIN Recognition APIs

```http
POST /api/v1/vehicle-library/recognition/vin-text
POST /api/v1/vehicle-library/recognition/vin-image
GET /api/v1/vehicle-library/recognition-records?vehicleId=&page=1&pageSize=20
```

First pass behavior:

- `vin-text` normalizes and validates the VIN, creates a `success` record, and returns normalized VIN plus any locally mapped fields available.
- `vin-image` creates a record around the uploaded VIN image asset. If no provider is integrated yet, return `pending` or `failed` explicitly; do not fake vehicle details.

## Frontend Integration Contract

The first UI consumer should be an API layer and types:

```text
src/api/vehicle-library.ts
src/types/vehicle-library.ts
```

Future UI surfaces:

- Vehicle library management page or panel for list/create/edit.
- Existing workspace vehicle input can gain a "select saved vehicle" mode.
- Existing `VehicleLookupField.vue` can keep handling brand/series lookup, but saved vehicle search should use vehicle-library API results, not the static `brand_series_simple.json` data.
- Video generation forms can prefill brand, series, model year, displacement, vehicle assets, and lot assets from a selected saved vehicle in a later pass.

## Executable Build Plan

### Phase 0: Branch And Safety Check

Commands:

```bash
git branch --show-current
git status --short --branch
git fetch origin test
git rebase origin/test
```

Acceptance:

- Current branch is `test`.
- Existing untracked folders such as `backups/` are not touched.
- No unrelated files are modified before implementation starts.

### Phase 1: Database Migration

Files:

- `backend/src/db/migrations.ts`
- `backend/src/db/migrate.ts`

Tasks:

- Add `CREATE TABLE IF NOT EXISTS` statements for source tables 1-5 only.
- Do not add `vehicle_video_projects`.
- Do not add `vehicle_video_project_materials`.
- Keep table charset/collation aligned with the current backend tables.
- Add idempotent repair helpers in `migrate.ts` only if needed for indexes or future column repair.

Commands:

```bash
cd backend
npm run migrate
```

Verification SQL:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'vehicle_libraries',
    'vehicle_lots',
    'vehicles',
    'vehicle_library_materials',
    'vehicle_recognition_records',
    'vehicle_video_projects',
    'vehicle_video_project_materials'
  )
ORDER BY table_name;
```

Acceptance:

- The first five tables exist.
- `vehicle_video_projects` does not exist.
- `vehicle_video_project_materials` does not exist.
- Running `npm run migrate` twice is clean.

### Phase 2: Backend Types And Slot Constants

Files:

- `backend/src/modules/vehicle-library/vehicleLibraryTypes.ts`

Tasks:

- Define status unions.
- Define `VehicleMaterialSlotCode`.
- Define vehicle and lot required slot arrays.
- Define request/response DTOs.
- Implement `normalizeVin`, `assertValidVin`, and slot lookup helpers.

Acceptance:

- Invalid slot code fails before DB write.
- Vehicle slot cannot be attached to a lot and lot slot cannot be attached to a vehicle.
- VIN normalization is deterministic.

### Phase 3: Repository Layer

Files:

- `backend/src/modules/vehicle-library/vehicleLibraryRepository.ts`

Tasks:

- Implement library lookup/create/update.
- Implement paginated vehicle and lot list queries.
- Implement vehicle/lot CRUD with soft delete.
- Implement material slot upsert/delete.
- Implement recognition-record insert/list.
- Implement completeness recalculation query for vehicle and lot owners.
- Implement library used-byte recalculation.

Acceptance:

- Queries always filter by library ownership.
- Material joins can return asset URL, thumbnail URL, mime type, and display metadata.
- Pagination uses stable ordering by `created_at DESC, id DESC`.

### Phase 4: Service Layer

Files:

- `backend/src/modules/vehicle-library/vehicleLibraryService.ts`

Tasks:

- Enforce current-user and tenant scope.
- Ensure default library for current user.
- Validate same-library `lot_id`.
- Validate asset ownership through `assetsRepository.findById(assetId, current.user.id)`.
- Validate media type by slot.
- Normalize VIN and handle duplicate VIN conflict.
- Recalculate owner completeness after material changes.
- Keep all responses in camelCase.

Acceptance:

- A user cannot read or mutate another user's vehicle library records.
- A user cannot attach another user's asset.
- Replacing the same material slot does not create duplicate slot rows.
- Deleting one required slot makes the owner `incomplete`.

### Phase 5: Routes

Files:

- `backend/src/modules/vehicle-library/vehicleLibraryRoutes.ts`
- `backend/src/app.ts`

Tasks:

- Add REST endpoints from the API contract.
- Use `asyncHandler`, `ok`, and existing `errors`.
- Keep route-level code thin; route functions call service methods.
- Mount the router under `/api/v1/vehicle-library` with `requireCurrentUser`.

Acceptance:

- All successful responses use `{ code, message, data, requestId }`.
- Invalid params return existing `invalidParameter` style errors.
- Missing login returns `401`.

### Phase 6: Contract Tests And Backend Checks

Files:

- `backend/src/modules/vehicle-library/vehicleLibraryContract.test.ts`
- `backend/package.json`

Tasks:

- Add script: `"vehicle-library-contract-test": "tsx src/modules/vehicle-library/vehicleLibraryContract.test.ts"`.
- Test VIN normalization and invalid VIN rejection.
- Test slot definitions and media requirements.
- Test vehicle completeness transition with mocked rows or a local DB transaction.
- Test library ownership guard.

Commands:

```bash
cd backend
npm run typecheck
npm run vehicle-library-contract-test
```

Acceptance:

- TypeScript passes.
- Contract test passes without relying on external AI providers.

### Phase 7: Frontend API Types

Files:

- `src/types/vehicle-library.ts`
- `src/api/vehicle-library.ts`

Tasks:

- Add camelCase frontend types matching backend responses.
- Add API functions for library home, vehicle CRUD, lot CRUD, material slot put/delete, and recognition records.
- Use existing `request` wrapper from `src/api/http.ts`.

Commands:

```bash
npm run typecheck
```

Acceptance:

- Frontend typecheck passes.
- No UI behavior changes are required in this phase.

### Phase 8: Smoke Test

Start backend and frontend as usual, then use a demo product user such as `enterprise / 123456`.

Minimum API smoke:

```bash
curl -s http://127.0.0.1:3101/health
```

After login token is available:

```bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:3101/api/v1/vehicle-library/me
```

Acceptance:

- `/health` returns `{ "ok": true }`.
- `/api/v1/vehicle-library/me` creates or returns the current user's active library.
- Creating a vehicle with brand and series succeeds.
- Linking all five required vehicle slots changes that vehicle to `complete`.
- Removing one required vehicle slot changes it back to `incomplete`.
- Source sections 6 and 7 remain unimplemented.

## Implementation Notes

- Prefer adding backend first and UI second. The product risk is mostly ownership, slot integrity, and migration safety.
- Keep the first UI integration read-only/prefill-oriented until the database API is verified.
- Do not store local file paths in vehicle-library tables beyond optional display metadata copied from `assets`; `assets` remains the file source of truth.
- Keep `last_generated_at` on `vehicles` even though generation projects are out of scope. Updating it later does not require adding sections 6 and 7.
