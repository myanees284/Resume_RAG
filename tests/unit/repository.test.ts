import { toResumeDocument } from "../../src/modules/ingestion/repositories/ResumeIngestionRepository";

describe("resume storage document", () => {
  it("stores skills and embedding arrays with model metadata", () => {
    const document = toResumeDocument({
      fileName: "resume.pdf",
      rawText: "Rajesh Mohan Kumar",
      name: "Rajesh Mohan Kumar",
      skills: ["RAG", "Python"],
      embedding: [0.01, -0.03],
      embeddingModel: "mistral-embed",
      embeddingDimension: 1024,
    });

    expect(document.rawText).not.toBe("");
    expect(Array.isArray(document.skills)).toBe(true);
    expect(Array.isArray(document.embedding)).toBe(true);
    expect(document.embeddingModel).toBe("mistral-embed");
    expect(document.email).toBeNull();
    expect(document.contentHash).toBeNull();
    expect(document.sourcePath).toBeNull();
  });
});
