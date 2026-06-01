# Generation Points Deduction Rules

Date: 2026-06-01
Branch: `feat/reusable-credits-integration`

This document records the first-release point consumption rules for usedCarPlatform generation workflows.

## Rule Summary

### Single Function Generation

Each single-function generation deducts `30` points per generated picture.

This applies to:

- scene studio functions under `场景影棚`
  - `showroom-light`
  - `outdoor-scene`
  - `road-motion`
  - `sky-studio`
- vehicle beauty functions under `车辆美容`
  - `paint-refresh`
  - `light-consistency`
  - `watermark-remove`
- `内饰清洁`
  - `interior-clean`

The baseline is stored in the Reusable Credits Platform application function catalog as `default_points = 30.0000`.

### Interior Collage / 内饰拼接

`内饰拼接` deducts `30 * generated_picture_count`.

The current backend splits one request into one or more generated collage tasks:

- 2-4 uploaded interior images -> 1 generated collage -> 30 points
- 5-8 uploaded interior images -> 2 generated collages -> 60 points
- 9-10 uploaded interior images -> 3 generated collages -> 90 points

Each generated collage task uses function code `interior-collage` and defaults to `30.0000` points.

### Batch New / 批量上新

For each generated picture in `批量上新`, the baseline is `30` points.

Under `视觉处理配置`, the billable toggles are:

- `enableSceneChange` / 开启场景更换
- `enableLightConsistency` / 光污一致化
- `enablePaintRefresh` / 漆面翻新预览
- `enableInteriorClean` / 内饰清洁增强

`useRecentLogo` / 使用最近 Logo does not affect points.

Per generated picture:

- no billable toggle selected: 30 points
- 1 billable toggle selected: 30 points
- 2 billable toggles selected: 40 points
- 3 billable toggles selected: 50 points
- 4 billable toggles selected: 60 points

Formula:

```text
points_per_picture = 30 + max(0, selected_billable_toggle_count - 1) * 10
```

The usedCar backend computes this in `backend/src/modules/billing/generationPointRules.ts` and sends the result to the Reusable Credits Platform through `POST /billing/estimate` as `estimatedPoints`.

## Implementation Notes

- Reusable Credits Platform remains the source of truth for balances, freezes, settlements, refunds, and ledger rows.
- usedCarPlatform owns the business rule that converts a usedCar generation request into a point estimate.
- Static single-function prices are kept in the credits platform function catalog.
- Dynamic batch prices are calculated by usedCarPlatform and passed as an estimate override.
