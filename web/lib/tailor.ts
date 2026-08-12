import type { CvProfile, TailorChange, TailorProposal } from "@/types/cv";
import { extractKeywords } from "@/lib/ats";

// Ported from src-tauri/src/nlp/tailor.rs + fallback.rs (tailor_cv_fallback) and
// src-tauri/src/semantic/ats.rs (extract_job_metadata). Runs client- and server-side.

export function extractJobMetadata(jobText: string): { company: string; role: string } {
  const lines = jobText.split("\n").map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] || "";

  let role = "";
  let company = "";

  // "Acme Corp is hiring a Senior Backend Engineer." style postings.
  const hiringMatch = jobText.match(
    /([A-Z][\w&.,'-]*(?:\s+[A-Z][\w&.,'-]*){0,4})\s+is\s+hiring\s+(?:a|an)?\s*([A-Za-z0-9/&\-, ]{3,60}?)[.\n]/i,
  );
  if (hiringMatch) {
    company = hiringMatch[1].trim();
    role = hiringMatch[2].trim();
  }

  // "We are seeking/looking for a Senior Backend Engineer..." style postings.
  if (!role) {
    const seekingMatch = jobText.match(
      /(?:seeking|looking for|hiring)\s+(?:a|an)\s+([A-Za-z0-9/&\-, ]{3,60}?)(?:\s+to\s+join|\s+at\s+|[.\n])/i,
    );
    if (seekingMatch) role = seekingMatch[1].trim();
  }

  // "Senior Backend Engineer at Acme Corp" style headers.
  if (!role) {
    const titleAtMatch = jobText.match(
      /^([A-Za-z0-9/&\-, ]{3,60}?)\s+at\s+([A-Z][\w&.,'-]*(?:\s+[A-Z][\w&.,'-]*){0,3})\b/,
    );
    if (titleAtMatch) {
      role = titleAtMatch[1].trim();
      if (!company) company = titleAtMatch[2].trim();
    }
  }

  // Fallback: short first line is probably a title/header; otherwise truncate so we never
  // show an entire multi-sentence job description as the "role".
  if (!role) {
    role = firstLine.length > 0 && firstLine.length <= 80 ? firstLine : firstLine.slice(0, 60).trim();
  }

  if (!company) {
    const atMatch = jobText.match(/\bat\s+([A-Z][\w&.,'-]*(?:\s+[A-Z][\w&.,'-]*){0,3})\b/);
    if (atMatch) company = atMatch[1].trim();
  }
  if (!company) {
    const companyLine = lines.find((l) => l.toLowerCase().includes("company"));
    if (companyLine) company = companyLine.replace(/company:?/i, "").trim();
  }

  return { company: company || "Company", role: role || "Role" };
}

/** Rule-based tailoring used when the AI call is unavailable or fails. */
export function tailorCvFallback(profile: CvProfile, keywords: string[]): CvProfile {
  const tailored: CvProfile = JSON.parse(JSON.stringify(profile));
  tailored.name = `${profile.name} (Tailored)`;
  tailored.id = "";

  const missing = keywords
    .filter((k) => !tailored.skills.some((s) => s.toLowerCase() === k.toLowerCase()))
    .slice(0, 5);
  if (missing.length > 0) {
    tailored.skills = [...tailored.skills, ...missing];
  }

  for (const exp of tailored.experience) {
    let inserted = 0;
    exp.bullets = exp.bullets.map((bullet) => {
      if (!bullet || inserted >= 2) return bullet;
      const lower = bullet.toLowerCase();
      for (const kw of keywords.slice(0, 2)) {
        if (!lower.includes(kw.toLowerCase()) && bullet.length < 180) {
          inserted += 1;
          return `${bullet} using ${kw}`;
        }
      }
      return bullet;
    });
  }

  return tailored;
}

/** Diffs an original profile against a tailored one, producing reviewable changes. */
export function diffProfiles(
  original: CvProfile,
  tailored: CvProfile,
  keywords: string[],
): TailorChange[] {
  const changes: TailorChange[] = [];

  original.experience.forEach((oexp, oi) => {
    const texp = tailored.experience[oi];
    if (!texp) return;
    oexp.bullets.forEach((ob, bi) => {
      const tb = texp.bullets[bi];
      if (tb && ob !== tb) {
        changes.push({
          id: crypto.randomUUID(),
          path: `experience.${oexp.id}.bullet${bi}`,
          before: ob,
          after: tb,
          reason: "Tailored bullet for job match",
        });
      }
    });
  });

  const originalSkills = original.skills.join(", ");
  const tailoredSkills = tailored.skills.join(", ");
  if (originalSkills !== tailoredSkills) {
    changes.push({
      id: crypto.randomUUID(),
      path: "skills",
      before: originalSkills,
      after: tailoredSkills,
      reason: "Added missing job keywords to skills",
    });
  }

  if (original.personal.summary !== tailored.personal.summary) {
    changes.push({
      id: crypto.randomUUID(),
      path: "personal.summary",
      before: original.personal.summary,
      after: tailored.personal.summary,
      reason: "Rewrote summary to match the role",
    });
  }

  if (changes.length === 0 && keywords.length > 0) {
    const missing = keywords
      .filter((k) => !original.skills.some((s) => s.toLowerCase() === k.toLowerCase()))
      .slice(0, 3);
    if (missing.length > 0) {
      const skills = [...original.skills, ...missing];
      changes.push({
        id: crypto.randomUUID(),
        path: "skills",
        before: originalSkills,
        after: skills.join(", "),
        reason: `Highlight keywords: ${missing.join(", ")}`,
      });
    }
  }

  return changes;
}

export function proposeTailorFallback(profile: CvProfile, jobText: string): TailorProposal {
  const { company, role } = extractJobMetadata(jobText);
  const keywords = extractKeywords(jobText);
  const tailored = tailorCvFallback(profile, keywords);
  const changes = diffProfiles(profile, tailored, keywords);
  return { changes, used_ai: false, company, role };
}

/** Applies the selected changes on top of the original profile, returning a new tailored CvProfile (unsaved). */
export function applyTailorChanges(
  profile: CvProfile,
  changes: TailorChange[],
  selectedIds: string[],
): CvProfile {
  const selected = new Set(selectedIds);
  const result: CvProfile = JSON.parse(JSON.stringify(profile));
  result.id = "";
  result.name = `${profile.name} (Tailored)`;
  result.parent_cv_id = profile.id || null;

  for (const change of changes) {
    if (!selected.has(change.id)) continue;
    if (change.path.startsWith("experience.")) {
      const parts = change.path.split(".");
      const expId = parts[1];
      const bulletPart = parts[2];
      const bi = bulletPart ? parseInt(bulletPart.replace("bullet", ""), 10) : NaN;
      const exp = result.experience.find((e) => e.id === expId);
      if (exp && !Number.isNaN(bi) && bi < exp.bullets.length) {
        exp.bullets[bi] = change.after;
      }
    } else if (change.path === "skills") {
      result.skills = change.after.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (change.path === "personal.summary") {
      result.personal.summary = change.after;
    }
  }

  return result;
}
