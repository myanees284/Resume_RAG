import fs from "fs/promises";
import path from "path";
import { closeDatabase, connectDatabase } from "../config/database";
import { env } from "../config/env";
import { FolderIngestionService } from "../modules/ingestion/services/FolderIngestionService";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

async function main(): Promise<void> {
  const folder = path.resolve(
    argValue("dir") ?? path.join(process.cwd(), "Resumes")
  );
  const limitRaw = argValue("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const concurrencyRaw = argValue("concurrency");
  const concurrency = concurrencyRaw ? Number(concurrencyRaw) : 5;

  if (env.useLlmParser) {
    console.warn(
      JSON.stringify({
        warning: "USE_LLM_PARSER is true; folder ingest will call Groq per file",
      })
    );
  }

  await connectDatabase();
  const report = await new FolderIngestionService().ingestFolder({
    folder,
    limit: Number.isFinite(limit) ? limit : undefined,
    concurrency: Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 5,
  });

  const reportsDir = path.join(process.cwd(), "reports");
  await fs.mkdir(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, "ingest-folder-report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log(
    JSON.stringify({
      event: "folder_ingest_complete",
      folder: report.folder,
      totals: report.totals,
      reportPath,
    })
  );

  await closeDatabase();
}

main().catch(async (error) => {
  console.error(
    JSON.stringify({
      event: "folder_ingest_failed",
      message: error instanceof Error ? error.message : "unknown error",
    })
  );
  await closeDatabase().catch(() => undefined);
  process.exitCode = 1;
});
