import type { CvProfile, ImprovementSuggestion } from "../types/cv";
import { newId } from "../types/cv";

export function applyImprovementSuggestion(
  profile: CvProfile,
  suggestion: ImprovementSuggestion,
): Partial<CvProfile> | null {
  if (!suggestion.field || !suggestion.suggested_value) return null;
  const field = suggestion.field;

  if (field === "professional_title") {
    return { professional_title: suggestion.suggested_value };
  }
  if (field === "personal.summary") {
    return { personal: { ...profile.personal, summary: suggestion.suggested_value } };
  }
  if (field === "personal.email" || field === "personal.phone") {
    const key = field.split(".")[1] as "email" | "phone";
    return { personal: { ...profile.personal, [key]: suggestion.suggested_value } };
  }
  if (field === "skills") {
    const extra = suggestion.suggested_value.split(",").map((s) => s.trim()).filter(Boolean);
    return { skills: [...new Set([...profile.skills, ...extra])] };
  }
  if (field.startsWith("experience.")) {
    const parts = field.split(".");
    if (parts.length >= 4 && parts[2] === "bullet") {
      const expId = parts[1];
      const bi = parseInt(parts[3], 10);
      const expIndex = profile.experience.findIndex((e) => e.id === expId);
      if (expIndex < 0 || Number.isNaN(bi)) return null;
      const exp = profile.experience[expIndex];
      const experience = [...profile.experience];
      const bullets = [...exp.bullets];
      if (bi < bullets.length) bullets[bi] = suggestion.suggested_value;
      experience[expIndex] = { ...exp, bullets };
      return { experience };
    }
  }
  return null;
}

export function createDefaultCertification(name: string) {
  return { id: newId(), name, issuer: "", year: "" };
}
