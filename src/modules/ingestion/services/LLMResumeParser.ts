import { env } from "../../../config/env";
import { AppError } from "../../../middleware/errorHandler";
import { ParsedResume } from "../types/ingestion.types";

const STRING_FIELDS = [
  "name",
  "email",
  "phone",
  "location",
  "company",
  "role",
  "education",
  "experienceSummary",
] as const;

const NUMBER_FIELDS = ["totalExperience", "relevantExperience"] as const;

export function validateParsedResume(value: unknown): ParsedResume {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(422, "RESUME_PARSE_FAILED", "Resume parsing failed");
  }

  const raw = value as Record<string, unknown>;
  const resume: ParsedResume = { skills: [] };

  for (const field of STRING_FIELDS) {
    const candidate = raw[field];
    if (typeof candidate === "string" && candidate.trim() !== "") {
      resume[field] = candidate.trim();
    }
  }

  for (const field of NUMBER_FIELDS) {
    const candidate = raw[field];
    const parsedNumber =
      typeof candidate === "number"
        ? candidate
        : typeof candidate === "string"
          ? Number(candidate)
          : NaN;
    if (Number.isFinite(parsedNumber)) {
      resume[field] = parsedNumber;
    }
  }

  if (Array.isArray(raw.skills)) {
    resume.skills = raw.skills.filter(
      (skill): skill is string => typeof skill === "string" && skill.trim() !== ""
    );
  }

  if (Array.isArray(raw.jobTitles)) {
    const titles = raw.jobTitles.filter(
      (title): title is string => typeof title === "string" && title.trim() !== ""
    );
    if (titles.length > 0) {
      resume.jobTitles = titles;
    }
  }

  return resume;
}

export class LLMResumeParser {
  async parseResume(rawText: string): Promise<ParsedResume> {
    if (!env.groqApiKey || !env.groqModel) {
      throw new AppError(422, "RESUME_PARSE_FAILED", "Resume parsing failed");
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.groqModel,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Extract resume fields as JSON only. Use keys: name, email, phone, location, company, role, education, totalExperience, relevantExperience, skills, jobTitles, experienceSummary. Omit unknown values. Never invent facts. skills and jobTitles must be string arrays. totalExperience and relevantExperience must be numbers.",
          },
          {
            role: "user",
            content: rawText.slice(0, 12000),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as
        | { error?: { code?: string; type?: string } }
        | null;
      console.error(
        JSON.stringify({
          errorCode: "RESUME_PARSE_FAILED",
          groqStatus: response.status,
          groqErrorCode: errorBody?.error?.code,
          groqErrorType: errorBody?.error?.type,
        })
      );
      throw new AppError(422, "RESUME_PARSE_FAILED", "Resume parsing failed");
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new AppError(422, "RESUME_PARSE_FAILED", "Resume parsing failed");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content.replace(/```json|```/g, "").trim());
    } catch {
      throw new AppError(422, "RESUME_PARSE_FAILED", "Resume parsing failed");
    }

    return validateParsedResume(parsed);
  }
}
