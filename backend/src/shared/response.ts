import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";

import { AppError, errors } from "./errors";
import { createId } from "./ids";

export const ok = <T>(res: Response, data: T) =>
  res.json({
    code: 0,
    message: "ok",
    data,
    requestId: res.locals.requestId,
  });

export const requestIdMiddleware = (_req: Request, res: Response, next: NextFunction) => {
  res.locals.requestId = createId("req");
  next();
};

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, 40400, "route not found"));
};

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof MulterError) {
    error =
      error.code === "LIMIT_FILE_SIZE"
        ? errors.fileTooLarge()
        : errors.invalidParameter(`upload failed: ${error.message}`, { code: error.code });
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      data: error.details ?? null,
      requestId: res.locals.requestId,
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    code: 50000,
    message: "internal server error",
    data: null,
    requestId: res.locals.requestId,
  });
};
