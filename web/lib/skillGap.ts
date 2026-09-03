import type { CvProfile, SkillGapResult } from '@/types/cv';
import { extractKeywords } from '@/lib/ats';
import { extractJobMetadata } from '@/lib/tailor';

const SKILL_GROUPS: [string, string[]][] = [
  ['react', ['reactjs', 'react.js']],
  ['typescript', ['ts']],
  ['javascript', ['js', 'node.js', 'nodejs']],
  ['sql', ['postgresql', 'postgres', 'mysql']],
  ['python', ['django', 'flask', 'pandas']],
  ['aws', ['amazon web services']],
  ['gcp', ['google cloud', 'google cloud platform']],
  ['azure', ['microsoft azure']],
  ['kubernetes', ['k8s']],
  ['docker', []],
  ['graphql', ['graphql api', 'graphql apis']],
  ['rest api', ['rest', 'api design', 'apis']],
  ['product strategy', ['roadmap', 'roadmap planning']],
  ['analytics', ['product analytics', 'data analysis']],
  ['experimentation', ['a/b testing', 'ab testing', 'testing']],
  ['stakeholder management', ['stakeholder communication']],
  ['leadership', ['cross-functional leadership', 'team leadership']],
  ['retention', ['customer retention']],
  ['conversion optimization', ['conversion', 'funnel optimization']],
  ['saas', ['software as a service']],
  ['go to market', ['gtm', 'go-to-market']],
];

const DISPLAY_NAMES: Record<string, string> = {
  react: 'React',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  sql: 'SQL',
  python: 'Python',
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
  kubernetes: 'Kubernetes',
  docker: 'Docker',
  graphql: 'GraphQL',
  'rest api': 'REST API',
  'product strategy': 'Product Strategy',
  analytics: 'Analytics',
  experimentation: 'Experimentation',
  'stakeholder management': 'Stakeholder Management',
  leadership: 'Leadership',
  retention: 'Retention',
  'conversion optimization': 'Conversion Optimization',
  saas: 'SaaS',
  'go to market': 'Go To Market',
};

const GENERIC_TERMS = new Set([
  'experience', 'manager', 'senior', 'team', 'work', 'role', 'partner', 'partners', 'improve', 'improved',
  'company', 'teams', 'product', 'products', 'customer', 'customers', 'business', 'platform', 'execution',
  'growth', 'initiatives', 'posting', 'description', 'engineer', 'design', 'market', 'title', 'required',
]);

const KNOWN_SKILLS = new Set(Object.keys(DISPLAY_NAMES));

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#./ -]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function canonicalize(value: string): string {
  const normalized = normalize(value);
  for (const [canonical, aliases] of SKILL_GROUPS) {
    const options = [canonical, ...aliases].map(normalize);
    if (options.some((option) => normalized === option || normalized.includes(option) || option.includes(normalized))) {
      return canonical;
    }
  }
  return normalized;
}

function displayName(value: string): string {
  return DISPLAY_NAMES[value] ?? value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function collectCandidateText(profile: CvProfile): string[] {
  return [
    profile.professional_title,
    profile.personal?.summary,
    ...(profile.skills ?? []),
    ...(profile.experience ?? []).flatMap((item) => [item.title, item.company, ...(item.bullets ?? [])]),
    ...(profile.projects ?? []).flatMap((item) => [item.name, item.description, ...(item.technologies ?? [])]),
    ...(profile.education ?? []).flatMap((item) => [item.degree, item.field, item.details]),
  ].filter(Boolean);
}

function isLikelySkill(rawKeyword: string, canonical: string, role: string, company: string): boolean {
  if (!canonical || GENERIC_TERMS.has(canonical)) return false;
  if (canonical === normalize(role) || canonical === normalize(company)) return false;
  if (KNOWN_SKILLS.has(canonical)) return true;
  if (/[+#/]/.test(rawKeyword)) return true;
  return /\b(api|apis|analytics|strategy|testing|automation|security|salesforce|tableau|looker|power bi)\b/.test(canonical);
}

function extractRequiredSkills(jobText: string): string[] {
  const normalizedText = normalize(jobText);
  const { company, role } = extractJobMetadata(jobText);

  const fromGroups = SKILL_GROUPS
    .filter(([canonical, aliases]) => [canonical, ...aliases].some((option) => normalizedText.includes(normalize(option))))
    .map(([canonical]) => canonical);

  const keywordCandidates = extractKeywords(jobText)
    .map((keyword) => ({ raw: keyword, canonical: canonicalize(keyword) }))
    .filter(({ raw, canonical }) => isLikelySkill(raw, canonical, role, company))
    .map(({ canonical }) => canonical);

  return [...new Set([...fromGroups, ...keywordCandidates])].slice(0, 15);
}

export function computeSkillGap(profile: CvProfile, jobText: string): SkillGapResult {
  const requiredSkills = extractRequiredSkills(jobText);
  const candidateText = collectCandidateText(profile).map(normalize).join(' ');
  const candidateCanonicals = new Set(
    collectCandidateText(profile)
      .flatMap((value) => value.split(/[,|/\n]/))
      .map(canonicalize)
      .filter(Boolean),
  );

  const matching = requiredSkills.filter((skill) => {
    const canonical = canonicalize(skill);
    if (candidateCanonicals.has(canonical)) return true;
    return candidateText.includes(normalize(canonical));
  });
  const missing = requiredSkills.filter((skill) => !matching.includes(skill));
  const gapScore = requiredSkills.length === 0 ? 0 : Math.round((matching.length / requiredSkills.length) * 100);

  const suggestions = missing.slice(0, 4).map((skill) => {
    const label = displayName(skill);
    if (profile.skills.length < 12) return `Add ${label} to your skills section if you genuinely use it.`;
    return `Show ${label} in an experience or project bullet with evidence.`;
  });

  return {
    gap_score: gapScore,
    matching_skills: matching.map(displayName),
    missing_skills: missing.map(displayName),
    suggestions,
  };
}
