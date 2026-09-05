import cors from "cors";
import express, { Application, Request, Response } from "express";
import { checkDatabaseHealth } from "./config/database";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./middleware/logger";
import { requestId } from "./middleware/requestId";
import { ingestionRoutes } from "./modules/ingestion/routes/ingestionRoutes";

export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use(requestId);
  app.use(logger);

  app.get("/v1/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      app: env.appName,
      version: env.appVersion,
      uptime: process.uptime(),
    });
  });

  app.get("/v1/health/db", async (_req: Request, res: Response) => {
    const health = await checkDatabaseHealth();

    if (!health.connected) {
      res.status(503).json({
        status: "error",
        database: "mongodb",
        connected: false,
        errorCode: health.errorCode ?? "DB_CONNECTION_FAILED",
      });
      return;
    }

    res.status(200).json({
      status: "ok",
      database: "mongodb",
      connected: true,
      latencyMs: health.latencyMs,
    });
  });

  app.use("/v1", ingestionRoutes);

  app.use(errorHandler);

  return app;
}
