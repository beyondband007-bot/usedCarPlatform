import assert from "node:assert/strict";

import { AppError } from "../../shared/errors";
import { vehicleLibraryRepository } from "./vehicleLibraryRepository";
import {
  assertValidVin,
  getMaterialSlotDefinition,
  isValidVin,
  lotRequiredSlotCodes,
  normalizeVin,
  parseOptionalDateString,
  vehicleRequiredSlotCodes,
} from "./vehicleLibraryTypes";

type CapturedCall = {
  sql: string;
  params?: Record<string, unknown>;
};

const captureRepository = () => {
  const calls: CapturedCall[] = [];
  const originalQuery = (vehicleLibraryRepository as any).query;
  const originalExecute = (vehicleLibraryRepository as any).execute;
  (vehicleLibraryRepository as any).query = async (
    sql: string,
    params?: Record<string, unknown>,
  ) => {
    calls.push({ sql, params });
    if (sql.includes("COUNT(")) return [{ total: 0 }];
    return [];
  };
  (vehicleLibraryRepository as any).execute = async (
    sql: string,
    params?: Record<string, unknown>,
  ) => {
    calls.push({ sql, params });
    return {};
  };
  return {
    calls,
    restore: () => {
      (vehicleLibraryRepository as any).query = originalQuery;
      (vehicleLibraryRepository as any).execute = originalExecute;
    },
  };
};

function assertThrowsAppError(fn: () => void) {
  assert.throws(fn, (error) => error instanceof AppError);
}

function testVinRules() {
  assert.equal(normalizeVin(" lsv2a2e1xhn123456 "), "LSV2A2E1XHN123456");
  assert.equal(normalizeVin(""), null);
  assert.equal(isValidVin("LSV2A2E1XHN123456"), true);
  assert.equal(isValidVin("LSV2A2E1XHN12345O"), false);
  assert.equal(isValidVin("SHORT"), false);
  assert.doesNotThrow(() => assertValidVin("LSV2A2E1XHN123456"));
  assertThrowsAppError(() => assertValidVin("LSV2A2E1XHN12345O"));
}

function testDateRules() {
  assert.equal(parseOptionalDateString("2026-02-28", "firstRegistrationDate"), "2026-02-28");
  assertThrowsAppError(() => parseOptionalDateString("2026-02-31", "firstRegistrationDate"));
  assertThrowsAppError(() => parseOptionalDateString("2026-13-01", "firstRegistrationDate"));
}

function testSlotRules() {
  assert.deepEqual(vehicleRequiredSlotCodes, [
    "front_image",
    "rear_image",
    "driver_image",
    "front_row_video",
    "rear_row_video",
  ]);
  assert.deepEqual(lotRequiredSlotCodes, ["lot_image", "lot_video"]);
  assert.equal(getMaterialSlotDefinition("vehicle", "front_image").mediaType, "image");
  assert.equal(getMaterialSlotDefinition("vehicle", "front_row_video").mediaType, "video");
  assert.equal(getMaterialSlotDefinition("lot", "lot_video").mediaType, "video");
  assertThrowsAppError(() => getMaterialSlotDefinition("lot", "front_image"));
  assertThrowsAppError(() => getMaterialSlotDefinition("vehicle", "lot_image"));
}

async function testRepositoryOwnershipScopeSql() {
  const captured = captureRepository();
  try {
    await vehicleLibraryRepository.findLibraryByIdForScope("vehicle_lib_1", {
      userId: "user_a",
      tenantId: null,
    });
    assert.match(captured.calls[0].sql, /owner_user_id = :userId/);
    assert.equal(captured.calls[0].params?.userId, "user_a");

    await vehicleLibraryRepository.findLibraryByIdForScope("vehicle_lib_2", {
      userId: "user_b",
      tenantId: "tenant_1",
    });
    assert.match(captured.calls[1].sql, /tenant_id = :tenantId OR owner_user_id = :userId/);
    assert.equal(captured.calls[1].params?.tenantId, "tenant_1");
  } finally {
    captured.restore();
  }
}

async function testCompletenessQueryUsesActiveRequiredSlots() {
  const captured = captureRepository();
  try {
    await vehicleLibraryRepository.countActiveRequiredSlots({
      libraryId: "vehicle_lib_1",
      ownerType: "vehicle",
      ownerId: "vehicle_1",
      requiredSlots: vehicleRequiredSlotCodes,
    });
    assert.match(captured.calls[0].sql, /COUNT\(DISTINCT slot_code\)/);
    assert.match(captured.calls[0].sql, /status = 'active'/);
    assert.match(captured.calls[0].sql, /audit_status <> 'rejected'/);
    assert.match(captured.calls[0].sql, /deleted_at IS NULL/);
    assert.equal(captured.calls[0].params?.slot0, "front_image");
    assert.equal(captured.calls[0].params?.slot4, "rear_row_video");
  } finally {
    captured.restore();
  }
}

async function testOwnerStatusTargetsExpectedTables() {
  const captured = captureRepository();
  try {
    await vehicleLibraryRepository.updateOwnerMaterialStatus({
      ownerType: "vehicle",
      ownerId: "vehicle_1",
      libraryId: "vehicle_lib_1",
      materialStatus: "complete",
    });
    assert.match(captured.calls[0].sql, /UPDATE vehicles/);

    await vehicleLibraryRepository.updateOwnerMaterialStatus({
      ownerType: "lot",
      ownerId: "lot_1",
      libraryId: "vehicle_lib_1",
      materialStatus: "incomplete",
    });
    assert.match(captured.calls[1].sql, /UPDATE vehicle_lots/);
  } finally {
    captured.restore();
  }
}

async function run() {
  testVinRules();
  testDateRules();
  testSlotRules();
  await testRepositoryOwnershipScopeSql();
  await testCompletenessQueryUsesActiveRequiredSlots();
  await testOwnerStatusTargetsExpectedTables();
  console.log("vehicle library contract tests passed");
}

void run();
