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
  invalidParameter: (message = "invalid parameter", details?: unknown) =>
    new AppError(400, 40003, message, details),
  fileTypeUnsupported: (details?: unknown) =>
    new AppError(400, 40001, "file type is not supported", details),
  fileTooLarge: (details?: unknown) => new AppError(400, 40002, "file is too large", details),
  assetNotFound: () => new AppError(404, 40401, "asset not found"),
  taskNotFound: () => new AppError(404, 40402, "task not found"),
  generationFailed: (message = "generation failed", details?: unknown) =>
    new AppError(500, 50001, message, details),
  kieKeyUnavailable: () => new AppError(503, 50301, "no available kie api key"),
};
