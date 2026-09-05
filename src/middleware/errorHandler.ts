import { NextFunction, Request, Response } from "express";
import multer from "multer";

export class AppError extends Error {
  statusCode: number;
  errorCode: string;

  constructor(statusCode: number, errorCode: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

function multerToAppError(err: multer.MulterError): AppError {
  if (err.code === "LIMIT_FILE_SIZE") {
    return new AppError(
      413,
      "FILE_TOO_LARGE",
      "Resume exceeds maximum upload size"
    );
  }

  return new AppError(400, "FILE_REQUIRED", "Resume PDF is required");
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const mappedError =
    err instanceof AppError
      ? err
      : err instanceof multer.MulterError
        ? multerToAppError(err)
        : null;

  const statusCode = mappedError?.statusCode ?? 500;
  const errorCode = mappedError?.errorCode ?? "INTERNAL_ERROR";
  const message =
    mappedError?.message ??
    (err instanceof Error ? err.message : "Internal server error");

  console.error(
    JSON.stringify({
      requestId: req.requestId,
      errorCode,
      message,
    })
  );

  res.status(statusCode).json({
    success: false,
    requestId: req.requestId,
    errorCode,
    message,
  });
}
