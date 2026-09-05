import fs from "fs/promises";
import os from "os";
import path from "path";
import { ResumeParserService } from "../../src/modules/ingestion/services/ResumeParserService";
import { buildSampleResumePdf } from "../helpers/samplePdf";

describe("pdf extraction in jest", () => {
  it("extracts text from a pdf-lib file", async () => {
    const pdfPath = path.join(os.tmpdir(), `jest-extract-${Date.now()}.pdf`);
    await fs.writeFile(pdfPath, await buildSampleResumePdf());
    const text = await new ResumeParserService().extractTextFromPdf(pdfPath);
    expect(text).toMatch(/Rajesh Mohan Kumar/i);
  });
});
