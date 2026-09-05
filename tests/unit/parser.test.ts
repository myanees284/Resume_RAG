import { AlgorithmResumeParser } from "../../src/modules/ingestion/services/AlgorithmResumeParser";

const SAMPLE_RESUME = `
Rajesh Mohan Kumar
Test Architect & Senior Agentic Test Engineer
Testleaf Software Solutions Private Limited
B.Tech - Information Technology
13+ years of experience in test automation
Skills: Selenium WebDriver, Core Java, C#, Python, REST Assured, Postman, RAG, DeepEval, MCP (Model Context Protocol)
`;

describe("algorithm resume parser", () => {
  const parser = new AlgorithmResumeParser();

  it("extracts structured fields from the sample resume", () => {
    const resume = parser.parseResume(SAMPLE_RESUME);

    expect(resume.name).toBe("Rajesh Mohan Kumar");
    expect(resume.role).toBe("Test Architect & Senior Agentic Test Engineer");
    expect(resume.company).toBe("Testleaf Software Solutions Private Limited");
    expect(resume.education).toMatch(/B\.?\s*Tech/i);
    expect(resume.totalExperience).toBe(13);
    expect(resume.skills).toEqual(
      expect.arrayContaining([
        "Selenium WebDriver",
        "Core Java",
        "C#",
        "Python",
        "REST Assured",
        "Postman",
        "RAG",
        "DeepEval",
        "MCP (Model Context Protocol)",
      ])
    );
  });
});
