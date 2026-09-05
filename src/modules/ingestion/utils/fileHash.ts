import { createHash } from "crypto";
import fs from "fs/promises";

export async function hashFile(filePath: string): Promise<string> {
  const bytes = await fs.readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}
