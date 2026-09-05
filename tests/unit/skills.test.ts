import { detectSkills } from "../../src/config/skills";

describe("skill detection", () => {
  it("detects skills from the sample resume sentence", () => {
    const rawText =
      "Experienced in Selenium WebDriver, Python, RAG, DeepEval and MCP (Model Context Protocol).";

    expect(detectSkills(rawText)).toEqual([
      "Selenium WebDriver",
      "Python",
      "RAG",
      "DeepEval",
      "MCP (Model Context Protocol)",
    ]);
  });

  it("does not treat JavaScript as Java", () => {
    expect(detectSkills("Worked with JavaScript")).not.toContain("Java");
  });
});
