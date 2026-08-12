import type {
  AtsCategory,
  AtsReport,
  CvProfile,
  ImprovementSuggestion,
} from "@/types/cv";

// Ported from src-tauri/src/semantic/{ats,match_engine,synonyms}.rs and
// src-tauri/src/nlp/rewrite.rs (extract_keywords) + import/improvements.rs.
// Runs fully client-side — no server round-trip needed.

const ACTION_VERBS = [
  "led", "managed", "developed", "created", "implemented", "designed", "built",
  "improved", "delivered", "conducted", "provided", "utilized", "leveraged",
  "performed", "maintained", "collaborated", "applied", "coached",
];

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "this", "that", "will", "have", "from", "your",
  "our", "are", "you", "all", "can", "able", "work", "team", "role", "job",
]);

const SYNONYMS: [string, string[]][] = [
  ["kubernetes", ["k8s", "kube"]],
  ["javascript", ["js", "ecmascript"]],
  ["typescript", ["ts"]],
  ["amazon web services", ["aws"]],
  ["google cloud platform", ["gcp"]],
  ["continuous integration", ["ci", "ci/cd"]],
  ["continuous delivery", ["cd", "ci/cd"]],
  ["machine learning", ["ml"]],
  ["artificial intelligence", ["ai"]],
  ["postgresql", ["postgres", "psql"]],
  ["node.js", ["node", "nodejs"]],
  ["react", ["reactjs", "react.js"]],
];

function normalizeSkill(s: string): string {
  return s.trim().toLowerCase();
}

function expandKeywords(keywords: string[]): string[] {
  const out = new Set<string>();
  for (const kw of keywords) {
    const n = normalizeSkill(kw);
    out.add(n);
    for (const [canonical, aliases] of SYNONYMS) {
      const group = [canonical, ...aliases].map(normalizeSkill);
      if (group.some((g) => n.includes(g) || g.includes(n))) {
        group.forEach((g) => out.add(g));
      }
    }
  }
  return [...out];
}

function keywordInText(keyword: string, text: string): boolean {
  const lower = text.toLowerCase();
  return expandKeywords([keyword]).some((k) => lower.includes(k));
}

export function extractKeywords(text: string): string[] {
  const re = /\b[A-Za-z][A-Za-z0-9+#.-]{2,}\b/g;
  const counts = new Map<string, number>();
  for (const match of text.matchAll(re)) {
    const word = match[0].toLowerCase();
    if (word.length > 3 && !STOP_WORDS.has(word)) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([k]) => k);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}...`;
}

let idCounter = 0;
function suggestionId(): string {
  idCounter += 1;
  return `sug-${Date.now()}-${idCounter}`;
}

export interface MatchResult {
  score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  section_scores: { section: string; score: number }[];
}

function cvToText(cv: CvProfile): string {
  const parts = [cv.personal.summary, cv.skills.join(" "), cv.professional_title];
  for (const exp of cv.experience) {
    parts.push(`${exp.title} ${exp.company} ${exp.bullets.join(" ")}`);
  }
  for (const edu of cv.education) {
    parts.push(`${edu.degree} ${edu.field} ${edu.institution}`);
  }
  for (const proj of cv.projects) {
    parts.push(`${proj.name} ${proj.description} ${proj.technologies.join(" ")}`);
  }
  return parts.join(" ");
}

function scoreSection(section: string, text: string, jdKeywords: string[]) {
  const matched = jdKeywords.filter((k) => keywordInText(k, text)).length;
  const score = jdKeywords.length === 0 ? 0 : (matched / jdKeywords.length) * 100;
  return { section, score };
}

export function computeMatch(cv: CvProfile, jobText: string): MatchResult {
  const jdKeywords = extractKeywords(jobText);
  const expandedJd = expandKeywords(jdKeywords);
  const cvText = cvToText(cv);

  const matched = jdKeywords.filter((k) => keywordInText(k, cvText));
  const missing = jdKeywords.filter((k) => !keywordInText(k, cvText));
  const score = jdKeywords.length === 0 ? 0 : (matched.length / jdKeywords.length) * 100;

  const sectionScores = [
    scoreSection(
      "experience",
      cv.experience.map((e) => `${e.title} ${e.bullets.join(" ")}`).join(" "),
      expandedJd,
    ),
    scoreSection("skills", cv.skills.join(" "), expandedJd),
    scoreSection(
      "education",
      cv.education.map((e) => `${e.degree} ${e.field}`).join(" "),
      expandedJd,
    ),
    scoreSection(
      "projects",
      cv.projects.map((p) => `${p.name} ${p.description}`).join(" "),
      expandedJd,
    ),
  ];

  return { score, matched_keywords: matched, missing_keywords: missing, section_scores: sectionScores };
}

export function suggestImprovements(profile: CvProfile): { suggestions: ImprovementSuggestion[]; score: number } {
  const suggestions: ImprovementSuggestion[] = [];
  let score = 100;

  if (!profile.personal.summary) {
    score -= 15;
    suggestions.push({
      id: suggestionId(),
      category: "missing_section",
      message: "Add a professional summary to introduce yourself",
      field: "personal.summary",
      suggested_value: null,
    });
  }
  if (!profile.personal.email) {
    score -= 10;
    suggestions.push({
      id: suggestionId(),
      category: "ats",
      message: "Add an email address for recruiters",
      field: "personal.email",
      suggested_value: null,
    });
  }
  if (!profile.personal.phone) {
    score -= 5;
    suggestions.push({
      id: suggestionId(),
      category: "ats",
      message: "Add a phone number",
      field: "personal.phone",
      suggested_value: null,
    });
  }
  if (!profile.professional_title) {
    score -= 5;
    suggestions.push({
      id: suggestionId(),
      category: "ats",
      message: "Add a professional title line under your name",
      field: "professional_title",
      suggested_value: null,
    });
  }
  if (profile.skills.length < 5) {
    score -= 10;
    suggestions.push({
      id: suggestionId(),
      category: "keywords",
      message: "Add more skills (aim for 8–15 relevant keywords)",
      field: "skills",
      suggested_value: null,
    });
  }
  if (profile.certifications.length === 0) {
    score -= 5;
    suggestions.push({
      id: suggestionId(),
      category: "missing_section",
      message: "List certifications to strengthen credibility",
      field: "certifications",
      suggested_value: null,
    });
  }

  for (const exp of profile.experience) {
    exp.bullets.forEach((bullet, bi) => {
      if (!bullet) return;
      const lower = bullet.toLowerCase();
      const startsWithVerb = ACTION_VERBS.some((v) => lower.startsWith(v));
      if (!startsWithVerb) {
        score -= 2;
        const improved = /^[a-z]/.test(lower) ? `Led ${lower}` : `Led ${lower}`;
        suggestions.push({
          id: suggestionId(),
          category: "bullet_quality",
          message: `Start bullet with an action verb: "${truncate(bullet, 50)}"`,
          field: `experience.${exp.id}.bullet.${bi}`,
          suggested_value: improved,
        });
      }
      const hasNumber = /\d/.test(bullet);
      if (!hasNumber) {
        suggestions.push({
          id: suggestionId(),
          category: "bullet_quality",
          message: `Add metrics where possible: "${truncate(bullet, 50)}"`,
          field: null,
          suggested_value: null,
        });
      }
    });
  }

  return {
    suggestions: suggestions.slice(0, 15),
    score: Math.min(100, Math.max(0, score)),
  };
}

function scoreContact(profile: CvProfile): AtsCategory {
  let score = 0;
  if (profile.personal.full_name) score += 25;
  if (profile.personal.email) score += 25;
  if (profile.personal.phone) score += 25;
  if (profile.personal.location) score += 25;
  return { name: "contact", score, max_score: 100 };
}

function scoreSections(profile: CvProfile): AtsCategory {
  const checks = [
    !!profile.personal.summary,
    profile.experience.length > 0,
    profile.skills.length >= 5,
    profile.education.length > 0,
  ];
  const score = (checks.filter(Boolean).length / checks.length) * 100;
  return { name: "sections", score, max_score: 100 };
}

function scoreBullets(profile: CvProfile): AtsCategory {
  let total = 0;
  let good = 0;
  for (const exp of profile.experience) {
    for (const bullet of exp.bullets) {
      if (!bullet) continue;
      total += 1;
      const lower = bullet.toLowerCase();
      const hasVerb = ACTION_VERBS.some((v) => lower.startsWith(v));
      const hasMetric = /\d/.test(bullet);
      if (hasVerb || hasMetric) good += 1;
    }
  }
  const score = total === 0 ? 50 : (good / total) * 100;
  return { name: "bullets", score, max_score: 100 };
}

export function computeAtsReport(profile: CvProfile, jobText?: string | null): AtsReport {
  const improvement = suggestImprovements(profile);
  const categories = [scoreContact(profile), scoreSections(profile), scoreBullets(profile)];

  let missingKeywords: string[] = [];
  if (jobText && jobText.trim()) {
    const match = computeMatch(profile, jobText);
    missingKeywords = match.missing_keywords;
    categories.push({ name: "job_keywords", score: match.score, max_score: 100 });
  }

  const categoryAvg =
    categories.length === 0
      ? improvement.score
      : categories.reduce((sum, c) => sum + c.score, 0) / categories.length;

  const score = Math.min(100, Math.max(0, categoryAvg * 0.6 + improvement.score * 0.4));

  return {
    score,
    categories,
    suggestions: improvement.suggestions,
    missing_keywords: missingKeywords,
  };
}
