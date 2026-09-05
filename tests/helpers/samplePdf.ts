import { PDFDocument, StandardFonts } from "pdf-lib";

export async function buildSampleResumePdf(): Promise<Buffer> {
  const document = await PDFDocument.create();
  const page = document.addPage();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const lines = [
    "Rajesh Mohan Kumar",
    "Test Architect and Senior Agentic Test Engineer",
    "Testleaf Software Solutions Private Limited",
    "B.Tech - Information Technology",
    "13+ years of experience",
    "Skills: Selenium WebDriver, Core Java, C#, Python, REST Assured, Postman, RAG, DeepEval",
  ];

  lines.forEach((line, index) => {
    page.drawText(line, {
      x: 50,
      y: 750 - index * 18,
      size: 12,
      font,
    });
  });

  return Buffer.from(await document.save());
}
