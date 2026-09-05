export function matchedSkills(skills: string[], query: string): string[] {
  const normalizedQuery = query.toLowerCase();
  const tokens = normalizedQuery.split(/[^a-z0-9+#.]/i).filter((token) => token.length > 1);

  return skills.filter((skill) => {
    const normalizedSkill = skill.toLowerCase();
    if (normalizedQuery.includes(normalizedSkill)) {
      return true;
    }

    return tokens.some((token) => normalizedSkill.includes(token));
  });
}
