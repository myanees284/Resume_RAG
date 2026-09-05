import { validateParsedResume } from "../../src/modules/ingestion/services/LLMResumeParser";

describe("LLM resume schema validation", () => {
  it("accepts known fields and drops unknown ones", () => {
    const resume = validateParsedResume({
      name: "Rajesh Mohan Kumar",
      totalExperience: 13,
      skills: ["Python", 12, "RAG"],
      invented: "nope",
    });

    expect(resume).toEqual({
      name: "Rajesh Mohan Kumar",
      totalExperience: 13,
      skills: ["Python", "RAG"],
    });
    expect(resume).not.toHaveProperty("invented");
  });

  it("rejects non-object payloads", () => {
    expect(() => validateParsedResume("not-json")).toThrow(
      "Resume parsing failed"
    );
  });
});
