import { errors } from "../../shared/errors";

export type VehicleLibraryStatus = "active" | "frozen" | "disabled";
export type VehicleOwnerType = "vehicle" | "lot";
export type VehicleMaterialStatus = "incomplete" | "complete";
export type VehicleRecordStatus = "active" | "sold" | "archived";
export type VehicleLotStatus = "active" | "archived";
export type VehicleIdentifyType = "manual" | "vin_text" | "vin_image";
export type VehicleLibraryMediaType = "image" | "video";
export type VehicleLibraryMaterialStatus = "active" | "processing" | "failed" | "deleted";
export type VehicleLibraryAuditStatus = "pending" | "passed" | "rejected";
export type VehicleRecognitionType = "vin_text" | "vin_image";
export type VehicleRecognitionStatus = "pending" | "success" | "failed";

export type VehicleMaterialSlotCode =
  | "front_image"
  | "rear_image"
  | "driver_image"
  | "front_row_video"
  | "rear_row_video"
  | "lot_image"
  | "lot_video";

export interface VehicleMaterialSlotDefinition {
  code: VehicleMaterialSlotCode;
  ownerType: VehicleOwnerType;
  mediaType: VehicleLibraryMediaType;
  required: boolean;
  cover: boolean;
  sortOrder: number;
}

export const vehicleMaterialSlots = [
  { code: "front_image", ownerType: "vehicle", mediaType: "image", required: true, cover: true, sortOrder: 10 },
  { code: "rear_image", ownerType: "vehicle", mediaType: "image", required: true, cover: false, sortOrder: 20 },
  { code: "driver_image", ownerType: "vehicle", mediaType: "image", required: true, cover: false, sortOrder: 30 },
  { code: "front_row_video", ownerType: "vehicle", mediaType: "video", required: true, cover: false, sortOrder: 40 },
  { code: "rear_row_video", ownerType: "vehicle", mediaType: "video", required: true, cover: false, sortOrder: 50 },
  { code: "lot_image", ownerType: "lot", mediaType: "image", required: true, cover: true, sortOrder: 10 },
  { code: "lot_video", ownerType: "lot", mediaType: "video", required: true, cover: false, sortOrder: 20 },
] as const satisfies readonly VehicleMaterialSlotDefinition[];

export const vehicleRequiredSlotCodes = vehicleMaterialSlots
  .filter((slot) => slot.ownerType === "vehicle" && slot.required)
  .map((slot) => slot.code);

export const lotRequiredSlotCodes = vehicleMaterialSlots
  .filter((slot) => slot.ownerType === "lot" && slot.required)
  .map((slot) => slot.code);

export const getMaterialSlotDefinition = (
  ownerType: VehicleOwnerType,
  slotCode: string,
) => {
  const slot = vehicleMaterialSlots.find(
    (item) => item.ownerType === ownerType && item.code === slotCode,
  );
  if (!slot) {
    throw errors.invalidParameter("invalid vehicle library material slot", {
      ownerType,
      slotCode,
    });
  }
  return slot;
};

export const normalizeVin = (value: unknown) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim().toUpperCase();
  return normalized.length ? normalized : null;
};

export const isValidVin = (value: string) => /^[A-HJ-NPR-Z0-9]{17}$/.test(value);

export const assertValidVin = (value: string | null) => {
  if (value && !isValidVin(value)) {
    throw errors.invalidParameter("VIN must be 17 characters and cannot contain I, O, or Q", {
      vin: value,
    });
  }
};

export const parseOptionalString = (value: unknown) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
};

export const parseRequiredString = (value: unknown, field: string) => {
  const text = parseOptionalString(value);
  if (!text) throw errors.invalidParameter(`${field} is required`, { field });
  return text;
};

export const parseOptionalNumber = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === "") return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw errors.invalidParameter(`${field} must be a non-negative number`, { field });
  }
  return numberValue;
};

export const parseOptionalInteger = (value: unknown, field: string) => {
  const numberValue = parseOptionalNumber(value, field);
  if (numberValue === null) return null;
  if (!Number.isInteger(numberValue)) {
    throw errors.invalidParameter(`${field} must be an integer`, { field });
  }
  return numberValue;
};

export const parseOptionalDateString = (value: unknown, field: string) => {
  const text = parseOptionalString(value);
  if (!text) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) {
    throw errors.invalidParameter(`${field} must be YYYY-MM-DD`, { field });
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
  if (!isValid) {
    throw errors.invalidParameter(`${field} must be YYYY-MM-DD`, { field });
  }
  return text;
};

export const parseJsonObject = (value: unknown) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw errors.invalidParameter("metadata must be an object");
  }
  return value as Record<string, unknown>;
};

export const isImageMimeType = (mimeType: string) => mimeType.toLowerCase().startsWith("image/");
export const isVideoMimeType = (mimeType: string) => mimeType.toLowerCase().startsWith("video/");
