import { NextFunction, Request, Response } from "express";

export function logger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();

  res.on("finish", () => {
    const durationMs =
      res.locals.searchTimings?.totalMs ??
      res.locals.ingestTimings?.totalMs ??
      Date.now() - startedAt;

    const payload: Record<string, unknown> = {
      requestId: req.requestId,
      endpoint: req.originalUrl,
      method: req.method,
      durationMs,
      statusCode: res.statusCode,
    };

    if (res.locals.fileName) {
      payload.fileName = res.locals.fileName;
    }

    if (res.locals.searchTimings) {
      payload.componentTimings = {
        embeddingMs: res.locals.searchTimings.embeddingMs,
        bm25Ms: res.locals.searchTimings.bm25Ms,
        vectorMs: res.locals.searchTimings.vectorMs,
        rerankMs: res.locals.searchTimings.rerankMs,
        summarizeMs: res.locals.searchTimings.summarizeMs,
      };
    } else if (res.locals.ingestTimings) {
      payload.extractMs = res.locals.ingestTimings.extractMs;
      payload.cleanMs = res.locals.ingestTimings.cleanMs;
      payload.parseMs = res.locals.ingestTimings.parseMs;
      payload.embeddingMs = res.locals.ingestTimings.embeddingMs;
      payload.mongoInsertMs = res.locals.ingestTimings.mongoInsertMs;
    }

    if (res.locals.searchWarnings?.length) {
      payload.warnings = res.locals.searchWarnings;
    }

    console.log(JSON.stringify(payload));
  });

  next();
}
