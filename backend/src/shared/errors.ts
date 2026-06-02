export class AppError extends Error {
  readonly statusCode: number;
  readonly code: number;
  readonly details?: unknown;

  constructor(statusCode: number, code: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const errors = {
  unauthorized: (message = "unauthorized", details?: unknown) =>
    new AppError(401, 40100, message, details),
  forbidden: (message = "forbidden", details?: unknown) =>
    new AppError(403, 40300, message, details),
  invalidParameter: (message = "invalid parameter", details?: unknown) =>
    new AppError(400, 40003, message, details),
  fileTypeUnsupported: (details?: unknown) =>
    new AppError(400, 40001, "file type is not supported", details),
  fileTooLarge: (details?: unknown) => new AppError(400, 40002, "file is too large", details),
  assetNotFound: () => new AppError(404, 40401, "asset not found"),
  taskNotFound: () => new AppError(404, 40402, "task not found"),
  batchNotFound: () => new AppError(404, 40403, "batch task not found"),
  packageNotFound: () => new AppError(404, 40404, "delivery package not found"),
  creativeConversationNotFound: () => new AppError(404, 40405, "creative conversation not found"),
  billingUnavailable: (message = "credits platform is unavailable", details?: unknown) =>
    new AppError(502, 50201, message, details),
  billingRejected: (statusCode: number, message = "credits platform rejected the request", details?: unknown) =>
    new AppError(statusCode, 40201, message, details),
  generationFailed: (message = "generation failed", details?: unknown) =>
    new AppError(500, 50001, message, details),
  packageFailed: (message = "package failed", details?: unknown) =>
    new AppError(500, 50002, message, details),
  kieKeyUnavailable: () => new AppError(503, 50301, "no available kie api key"),
};
