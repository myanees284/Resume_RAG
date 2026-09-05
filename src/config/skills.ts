export const SKILLS = [
  "MCP (Model Context Protocol)",
  "Selenium WebDriver",
  "REST Assured",
  "Azure DevOps",
  "AWS Lambda",
  "Core Java",
  "API Testing",
  "Playwright",
  "Selenium",
  "Postman",
  "MongoDB",
  "Jenkins",
  "Python",
  "Cucumber",
  "Langchain",
  "Langgraph",
  "DeepEval",
  "GitHub",
  "GenAI",
  "Java",
  "SQL",
  "C#",
  "RAG",
];

function skillPattern(skill: string): RegExp {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefix = /^\w/.test(skill) ? "\\b" : "";
  const suffix = /\w$/.test(skill) ? "\\b" : "";
  return new RegExp(`${prefix}${escaped}${suffix}`, "i");
}

export function detectSkills(text: string): string[] {
  const byLength = [...SKILLS].sort((left, right) => right.length - left.length);
  const matches: { skill: string; index: number }[] = [];

  for (const skill of byLength) {
    const match = text.match(skillPattern(skill));
    if (!match || match.index === undefined) {
      continue;
    }

    const overlapsExisting = matches.some(
      (existing) =>
        existing.skill.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(existing.skill.toLowerCase())
    );

    if (!overlapsExisting) {
      matches.push({ skill, index: match.index });
    }
  }

  return matches
    .sort((left, right) => left.index - right.index)
    .map((item) => item.skill);
}
