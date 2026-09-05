import { cleanResumeText } from "../../src/modules/ingestion/utils/textCleaner";

describe("textCleaner", () => {
  it("collapses extra spaces and blank lines", () => {
    expect(
      cleanResumeText(
        "Rajesh Mohan Kumar\n\n\nTest Architect & Senior Agentic Test Engineer   \n RAG"
      )
    ).toBe(
      "Rajesh Mohan Kumar\nTest Architect & Senior Agentic Test Engineer\nRAG"
    );
  });

  it("keeps technical skill symbols", () => {
    expect(cleanResumeText("Skills:  C#   C++   .NET")).toBe(
      "Skills: C# C++ .NET"
    );
  });
});
