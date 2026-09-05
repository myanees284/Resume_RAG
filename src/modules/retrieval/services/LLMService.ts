import { env } from "../../../config/env";
import { AppError } from "../../../middleware/errorHandler";
import { validateParsedResume } from "../../ingestion/services/LLMResumeParser";
import { SearchCandidate } from "../types/retrieval.types";
import {
  applyRerankToCandidates,
  parseLlmJson,
  validateRerankOutput,
  validateSummaryOutput,
} from "../utils/llmOutput";

export interface SummarizeOptions {
  style?: "short" | "detailed";
  maxTokens?: number;
}

async function groqJson(
  system: string,
  user: string,
  maxTokens?: number
): Promise<unknown> {
  if (!env.groqApiKey || !env.groqModel) {
    throw new AppError(502, "LLM_UNAVAILABLE", "Groq LLM is not configured");
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
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    console.error(
      JSON.stringify({
        errorCode: "LLM_UNAVAILABLE",
        groqStatus: response.status,
      })
    );
    throw new AppError(502, "LLM_UNAVAILABLE", "Groq LLM is not configured");
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new AppError(502, "LLM_OUTPUT_INVALID", "LLM output was invalid");
  }

  return parseLlmJson(content);
}

export class LLMService {
  constructor(private readonly complete = groqJson) {}

  async rerankCandidates(
    query: string,
    candidates: SearchCandidate[],
    topK = env.rerankDefaultTopN
  ): Promise<SearchCandidate[]> {
    const limited = candidates.slice(0, Math.max(topK, env.rerankDefaultTopN));
    const allowedIds = new Set(limited.map((candidate) => candidate.resumeId));

    const parsed = await this.complete(
      "Re-rank resume candidates for a recruiter query. Return JSON only: {\"results\":[{\"resumeId\":\"\",\"relevanceScore\":0,\"reason\":\"\"}]}. relevanceScore is 0 to 1. Use only supplied resumeIds. Never invent candidates or facts.",
      JSON.stringify({
        query,
        candidates: limited.map((candidate) => ({
          resumeId: candidate.resumeId,
          name: candidate.name,
          role: candidate.role,
          snippet: candidate.snippet,
        })),
      })
    );

    const ranked = validateRerankOutput(parsed, allowedIds, topK);
    if (ranked.length === 0) {
      throw new AppError(502, "LLM_OUTPUT_INVALID", "LLM output was invalid");
    }

    return applyRerankToCandidates(limited, ranked);
  }

  async summarizeCandidateFit(
    query: string,
    candidate: SearchCandidate,
    options: SummarizeOptions = {}
  ): Promise<string> {
    const style = options.style === "detailed" ? "detailed" : "short";
    const maxTokens = options.maxTokens ?? (style === "short" ? 150 : 400);
    const parsed = await this.complete(
      `Write a ${style} candidate-fit summary grounded only in the supplied snippet. Keep it ${style === "short" ? "to 2 sentences" : "to one short paragraph"} (about ${maxTokens} tokens). Return JSON {\"summary\":\"\"}. Never invent employers, skills, or years.`,
      JSON.stringify({
        query,
        resumeId: candidate.resumeId,
        name: candidate.name,
        role: candidate.role,
        snippet: candidate.snippet,
      })
    );

    return validateSummaryOutput(parsed);
  }

  async extractMetadata(rawText: string): Promise<Record<string, unknown>> {
    const parsed = await this.complete(
      "Extract resume fields as JSON only. Use keys: name, email, phone, location, company, role, education, totalExperience, relevantExperience, skills, jobTitles, experienceSummary. Omit unknown values. Never invent facts.",
      rawText.slice(0, 12000)
    );

    return { ...validateParsedResume(parsed) };
  }
}
