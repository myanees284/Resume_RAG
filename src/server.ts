import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

async function start(): Promise<void> {
  const app = createApp();

  app.listen(env.port, () => {
    console.log(
      JSON.stringify({
        event: "server_started",
        app: env.appName,
        port: env.port,
        env: env.nodeEnv,
      })
    );
  });

  try {
    await connectDatabase();
    console.log(
      JSON.stringify({
        event: "db_connected",
        database: env.dbName,
        collection: env.collectionName,
      })
    );
  } catch {
    console.error(
      JSON.stringify({
        event: "db_connection_failed",
        errorCode: "DB_CONNECTION_FAILED",
      })
    );
  }
}

void start();
