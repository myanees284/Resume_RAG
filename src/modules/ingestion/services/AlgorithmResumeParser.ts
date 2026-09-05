import { detectSkills } from "../../../config/skills";
import { ParsedResume } from "../types/ingestion.types";
import {
  extractEmails,
  extractPhones,
  extractYearsOfExperience,
} from "../utils/regex";

const TITLE_PATTERN =
  /\b(architect|engineer|developer|tester|manager|lead|analyst|consultant|specialist|sdet|qa)\b/i;

const COMPANY_PATTERN =
  /\b(pvt\.?\s*ltd\.?|private limited|limited|inc\.?|llc|solutions|technologies|labs|systems|software)\b/i;

const EDUCATION_PATTERN =
  /\b((?:B\.?\s*Tech|M\.?\s*Tech|B\.?\s*E\.?|M\.?\s*E\.?|MBA|B\.?\s*Sc|M\.?\s*Sc|Bachelor(?:'s)?|Master(?:'s)?)[^\n]{0,80})/i;

const NAME_SKIP_PATTERN =
  /^(resume|curriculum|vitae|cv|contact|email|phone|summary|experience|education|skills|projects|profile)/i;

function linesOf(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function looksLikeName(line: string): boolean {
  if (NAME_SKIP_PATTERN.test(line) || /@/.test(line) || /\d{5,}/.test(line)) {
    return false;
  }

  const words = line.split(/\s+/);
  if (words.length < 2 || words.length > 5) {
    return false;
  }

  return words.every((word) => /^[A-Z][A-Za-z.'-]*$/.test(word));
}

function extractName(lines: string[]): string | undefined {
  return lines.slice(0, 8).find(looksLikeName);
}

function extractRole(lines: string[], name?: string): string | undefined {
  return lines.slice(0, 20).find(
    (line) =>
      line !== name &&
      TITLE_PATTERN.test(line) &&
      !COMPANY_PATTERN.test(line) &&
      line.length < 140
  );
}

function extractCompany(lines: string[], role?: string): string | undefined {
  return lines.find(
    (line) =>
      line !== role &&
      COMPANY_PATTERN.test(line) &&
      line.length < 140 &&
      !EDUCATION_PATTERN.test(line)
  );
}

function extractEducation(text: string): string | undefined {
  const match = text.match(EDUCATION_PATTERN);
  return match?.[1]?.replace(/\s+/g, " ").trim();
}

function extractJobTitles(lines: string[], role?: string): string[] | undefined {
  const titles = [...new Set(
    lines.filter(
      (line) =>
        TITLE_PATTERN.test(line) &&
        !COMPANY_PATTERN.test(line) &&
        line.length < 140
    )
  )];

  if (role && !titles.includes(role)) {
    titles.unshift(role);
  }

  return titles.length > 0 ? titles.slice(0, 8) : undefined;
}

function extractExperienceSummary(text: string): string | undefined {
  const match = text.match(/([^\n.]{10,180}\b(?:years|yrs)\b[^\n.]{0,80})/i);
  return match?.[1]?.replace(/\s+/g, " ").trim();
}

export class AlgorithmResumeParser {
  parseResume(rawText: string): ParsedResume {
    const lines = linesOf(rawText);
    const name = extractName(lines);
    const role = extractRole(lines, name);
    const company = extractCompany(lines, role);
    const education = extractEducation(rawText);
    const email = extractEmails(rawText)[0];
    const phone = extractPhones(rawText)[0];
    const totalExperience = extractYearsOfExperience(rawText);
    const jobTitles = extractJobTitles(lines, role);
    const experienceSummary = extractExperienceSummary(rawText);
    const skills = detectSkills(rawText);

    return {
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(company ? { company } : {}),
      ...(role ? { role } : {}),
      ...(education ? { education } : {}),
      ...(totalExperience !== undefined ? { totalExperience } : {}),
      skills,
      ...(jobTitles ? { jobTitles } : {}),
      ...(experienceSummary ? { experienceSummary } : {}),
    };
  }
}
