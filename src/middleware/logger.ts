import { NextFunction, Request, Response } from "express";

export function logger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();

  res.on("finish", () => {
    const payload: Record<string, unknown> = {
      requestId: req.requestId,
      endpoint: req.originalUrl,
      statusCode: res.statusCode,
      totalMs: res.locals.ingestTimings?.totalMs ?? Date.now() - startedAt,
    };

    if (res.locals.fileName) {
      payload.fileName = res.locals.fileName;
    }

    if (res.locals.ingestTimings) {
      payload.extractMs = res.locals.ingestTimings.extractMs;
      payload.cleanMs = res.locals.ingestTimings.cleanMs;
      payload.parseMs = res.locals.ingestTimings.parseMs;
      payload.embeddingMs = res.locals.ingestTimings.embeddingMs;
      payload.mongoInsertMs = res.locals.ingestTimings.mongoInsertMs;
    }

    console.log(JSON.stringify(payload));
  });

  next();
}
