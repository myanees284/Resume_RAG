export const EMAIL_REGEX =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

export const PHONE_REGEX =
  /(\+91[\-\s]?)?[0]?(91)?[789]\d{9}/;

export const EXPERIENCE_REGEX =
  /(\d+(\.\d+)?)\+?\s*(years|yrs)/i;

function matchAll(regex: RegExp, text: string): string[] {
  const globalRegex = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
  return [...text.matchAll(globalRegex)].map((match) => match[0]);
}

export function extractEmails(text: string): string[] {
  return [...new Set(matchAll(EMAIL_REGEX, text))];
}

export function extractPhones(text: string): string[] {
  return [...new Set(matchAll(PHONE_REGEX, text))];
}

export function extractYearsOfExperience(text: string): number | undefined {
  const match = text.match(EXPERIENCE_REGEX);
  if (!match) {
    return undefined;
  }

  const years = Number(match[1]);
  return Number.isFinite(years) ? years : undefined;
}
