import { Collection, Db, Document, MongoClient } from "mongodb";
import { env } from "./env";

let client: MongoClient | null = null;
let db: Db | null = null;
let connecting: Promise<Db> | null = null;

export async function connectDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  if (connecting) {
    return connecting;
  }

  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is not set");
  }

  connecting = (async () => {
    const mongoClient = new MongoClient(env.mongodbUri, {
      serverSelectionTimeoutMS: 10000,
    });
    await mongoClient.connect();
    client = mongoClient;
    db = mongoClient.db(env.dbName);
    await db.collection(env.collectionName).estimatedDocumentCount();
    return db;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

export function getDb(): Db {
  if (!db) {
    throw new Error("Database is not connected");
  }
  return db;
}

export function getResumesCollection<T extends Document = Document>(): Collection<T> {
  return getDb().collection<T>(env.collectionName);
}

export function isDatabaseConnected(): boolean {
  return db !== null;
}

export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  latencyMs: number;
  errorCode?: string;
}> {
  const startedAt = Date.now();

  try {
    const database = await connectDatabase();
    await database.command({ ping: 1 });
    await database.collection(env.collectionName).estimatedDocumentCount();

    return {
      connected: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return {
      connected: false,
      latencyMs: Date.now() - startedAt,
      errorCode: "DB_CONNECTION_FAILED",
    };
  }
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
  }
  client = null;
  db = null;
  connecting = null;
}
