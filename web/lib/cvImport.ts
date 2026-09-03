import pdfParse from 'pdf-parse';
import type {
  CertificationItem,
  CourseItem,
  CvProfile,
  EducationItem,
  ExperienceItem,
  ImportResult,
  LanguageItem,
  LinkItem,
  ProjectItem,
} from '@/types/cv';
import { createEmptyCv, newId, normalizePersonal } from '@/types/cv';
import { requestDeepSeekJson } from '@/lib/deepseek';

interface ParsedImportPayload {
  name?: string;
  professional_title?: string;
  personal?: {
    full_name?: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
    links?: Array<{ label?: string; url?: string }>;
  };
  experience?: Array<{
    company?: string;
    title?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    current?: boolean;
    bullets?: string[];
  }>;
  education?: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    start_date?: string;
    end_date?: string;
    details?: string;
  }>;
  skills?: string[];
  projects?: Array<{
    name?: string;
    description?: string;
    technologies?: string[];
    url?: string;
  }>;
  certifications?: Array<{
    name?: string;
    issuer?: string;
    year?: string;
  }>;
  courses?: Array<{
    name?: string;
    provider?: string;
    date?: string;
    format?: string;
  }>;
  languages?: Array<{
    language?: string;
    level?: string;
  }>;
  warnings?: string[];
}

const SECTION_HEADERS: Record<string, string> = {
  summary: 'summary',
  profile: 'summary',
  about: 'summary',
  experience: 'experience',
  'professional experience': 'experience',
  employment: 'experience',
  work: 'experience',
  education: 'education',
  skills: 'skills',
  projects: 'projects',
  certifications: 'certifications',
  courses: 'courses',
  training: 'courses',
  languages: 'languages',
};

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function cleanLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\u0000/g, ' ').trim())
    .filter(Boolean);
}

function uniqueStrings(values: unknown[], limit = 50): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of values) {
    const cleaned = cleanText(value);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(cleaned);
    if (next.length >= limit) break;
  }
  return next;
}

function normalizeLinks(input: Array<{ label?: string; url?: string }> | undefined): LinkItem[] {
  return (input ?? [])
    .map((link) => ({
      id: newId(),
      label: cleanText(link?.label) || 'Link',
      url: cleanText(link?.url),
    }))
    .filter((link) => link.url);
}

function normalizeExperience(input: ParsedImportPayload['experience']): ExperienceItem[] {
  return (input ?? [])
    .map((item) => ({
      id: newId(),
      company: cleanText(item?.company),
      title: cleanText(item?.title),
      location: cleanText(item?.location),
      start_date: cleanText(item?.start_date),
      end_date: cleanText(item?.end_date),
      current: Boolean(item?.current) || /present|current/i.test(cleanText(item?.end_date)),
      bullets: uniqueStrings(Array.isArray(item?.bullets) ? item.bullets : [], 8),
    }))
    .filter((item) => item.company || item.title || item.bullets.length > 0)
    .map((item) => ({ ...item, bullets: item.bullets.length ? item.bullets : [''] }));
}

function normalizeEducation(input: ParsedImportPayload['education']): EducationItem[] {
  return (input ?? [])
    .map((item) => ({
      id: newId(),
      institution: cleanText(item?.institution),
      degree: cleanText(item?.degree),
      field: cleanText(item?.field),
      start_date: cleanText(item?.start_date),
      end_date: cleanText(item?.end_date),
      details: cleanText(item?.details),
    }))
    .filter((item) => item.institution || item.degree || item.field);
}

function normalizeProjects(input: ParsedImportPayload['projects']): ProjectItem[] {
  return (input ?? [])
    .map((item) => ({
      id: newId(),
      name: cleanText(item?.name),
      description: cleanText(item?.description),
      technologies: uniqueStrings(Array.isArray(item?.technologies) ? item.technologies : [], 10),
      url: cleanText(item?.url),
    }))
    .filter((item) => item.name || item.description);
}

function normalizeCertifications(input: ParsedImportPayload['certifications']): CertificationItem[] {
  return (input ?? [])
    .map((item) => ({
      id: newId(),
      name: cleanText(item?.name),
      issuer: cleanText(item?.issuer),
      year: cleanText(item?.year),
    }))
    .filter((item) => item.name || item.issuer);
}

function normalizeCourses(input: ParsedImportPayload['courses']): CourseItem[] {
  return (input ?? [])
    .map((item) => ({
      id: newId(),
      name: cleanText(item?.name),
      provider: cleanText(item?.provider),
      date: cleanText(item?.date),
      format: cleanText(item?.format) || 'Online',
    }))
    .filter((item) => item.name || item.provider);
}

function normalizeLanguages(input: ParsedImportPayload['languages']): LanguageItem[] {
  return (input ?? [])
    .map((item) => ({
      id: newId(),
      language: cleanText(item?.language),
      level: cleanText(item?.level),
    }))
    .filter((item) => item.language);
}

function detectColumnScramble(lines: string[]): boolean {
  if (lines.length < 12) return false;
  const narrowLines = lines.filter((line) => line.length > 0 && line.length <= 18).length;
  return narrowLines / lines.length > 0.45;
}

function splitSections(lines: string[]): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let current = 'header';
  sections[current] = [];

  for (const line of lines) {
    const lowered = line.toLowerCase().replace(/[:|]/g, '').trim();
    const header = SECTION_HEADERS[lowered];
    if (header) {
      current = header;
      sections[current] = sections[current] ?? [];
      continue;
    }
    sections[current] = sections[current] ?? [];
    sections[current].push(line);
  }

  return sections;
}

function extractHeaderContact(lines: string[]) {
  const headerText = lines.join(' ');
  const email = headerText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)?.[0] ?? '';
  const phone = headerText.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] ?? '';
  const urls = Array.from(headerText.matchAll(/https?:\/\/[^\s]+/gi)).map((match) => match[0]);
  const locationLine = lines.find((line) => !email || !line.includes(email));

  return {
    email: cleanText(email),
    phone: cleanText(phone),
    location: cleanText(locationLine).replace(email, '').replace(phone, '').trim(),
    links: urls.map((url) => ({ label: /linkedin/i.test(url) ? 'LinkedIn' : 'Website', url })),
  };
}

function parseExperienceLine(line: string) {
  const parts = line.split(/\s+[|@-]\s+/).map((part) => cleanText(part));
  if (parts.length >= 2) {
    return { title: parts[0], company: parts[1] };
  }
  const atMatch = line.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    return { title: cleanText(atMatch[1]), company: cleanText(atMatch[2]) };
  }
  return { title: cleanText(line), company: '' };
}

function fallbackParse(rawText: string, sourceFilename: string): ParsedImportPayload {
  const lines = cleanLines(rawText);
  const sections = splitSections(lines);
  const header = sections.header ?? [];
  const headerContact = extractHeaderContact(header);

  const firstMeaningful = header.find((line) => !/@/.test(line) && line.length > 3) ?? header[0] ?? '';
  const professionalTitle = header.find((line) => line !== firstMeaningful && !/@/.test(line) && !/https?:\/\//i.test(line)) ?? '';

  const experienceLines = sections.experience ?? [];
  const experience: ExperienceItem[] = [];
  let currentExperience: ExperienceItem | null = null;
  for (const line of experienceLines) {
    if (/^[•*-]/.test(line)) {
      if (currentExperience) currentExperience.bullets.push(cleanText(line.replace(/^[•*-]\s*/, '')));
      continue;
    }
    if (/\b(19|20)\d{2}\b/.test(line) || / at /i.test(line) || / \| /.test(line)) {
      if (currentExperience) experience.push(currentExperience);
      const parsed = parseExperienceLine(line.replace(/\b(19|20)\d{2}.*$/, '').trim());
      currentExperience = {
        id: newId(),
        company: parsed.company,
        title: parsed.title,
        location: '',
        start_date: '',
        end_date: '',
        current: false,
        bullets: [],
      };
      continue;
    }
    if (currentExperience && line.length > 20) currentExperience.bullets.push(cleanText(line));
  }
  if (currentExperience) experience.push(currentExperience);

  const education = (sections.education ?? []).reduce<EducationItem[]>((items, line) => {
    if (!line) return items;
    const cleaned = cleanText(line);
    if (!cleaned) return items;
    items.push({
      id: newId(),
      institution: cleaned,
      degree: '',
      field: '',
      start_date: '',
      end_date: '',
      details: '',
    });
    return items;
  }, []);

  const skills = uniqueStrings(
    (sections.skills ?? [])
      .flatMap((line) => line.split(/[•,|/]/))
      .map((part) => cleanText(part)),
    20,
  );

  const summary = cleanText((sections.summary ?? []).join(' '));

  return {
    name: cleanText(firstMeaningful) || sourceFilename.replace(/\.pdf$/i, ''),
    professional_title: cleanText(professionalTitle),
    personal: {
      full_name: cleanText(firstMeaningful),
      email: headerContact.email,
      phone: headerContact.phone,
      location: headerContact.location,
      summary,
      links: headerContact.links,
    },
    experience,
    education,
    skills,
    projects: [],
    certifications: [],
    courses: [],
    languages: [],
    warnings: ['Used rule-based parsing because the AI parser was unavailable. Review the imported fields carefully.'],
  };
}

async function parseWithDeepSeek(rawText: string): Promise<ParsedImportPayload | null> {
  const prompt = `You are parsing resume text into structured JSON for a CV builder. Extract only information that is clearly supported by the text. Do not invent facts. Preserve bullet points where possible.

Return ONLY valid JSON matching exactly this shape, no markdown fences, no commentary:
{"name":"","professional_title":"","personal":{"full_name":"","email":"","phone":"","location":"","summary":"","links":[{"label":"","url":""}]},"experience":[{"company":"","title":"","location":"","start_date":"","end_date":"","current":false,"bullets":[""]}],"education":[{"institution":"","degree":"","field":"","start_date":"","end_date":"","details":""}],"skills":[""],"projects":[{"name":"","description":"","technologies":[""],"url":""}],"certifications":[{"name":"","issuer":"","year":""}],"courses":[{"name":"","provider":"","date":"","format":""}],"languages":[{"language":"","level":""}],"warnings":[""]}

Rules:
- Keep summary concise, 2 to 4 sentences max.
- Normalize dates only if obvious, otherwise keep source wording.
- If a section is missing, return an empty array or empty string.
- Put public profile URLs in personal.links.
- Experience bullets must stay truthful to the source text.

Resume text:
"""
${rawText.slice(0, 14000)}
"""`;

  return requestDeepSeekJson<ParsedImportPayload>(prompt, {
    temperature: 0.1,
    timeoutMs: 30000,
  });
}

function buildProfileFromParsed(
  parsed: ParsedImportPayload,
  sourceFilename: string,
  existingProfile?: CvProfile | null,
): CvProfile {
  const base = existingProfile ? (JSON.parse(JSON.stringify(existingProfile)) as CvProfile) : createEmptyCv();
  const links = normalizeLinks(parsed.personal?.links);
  const fullName = cleanText(parsed.personal?.full_name) || cleanText(parsed.name) || base.personal.full_name || base.name;
  const profileName = cleanText(parsed.name) || (fullName ? `${fullName} CV` : sourceFilename.replace(/\.pdf$/i, ''));

  const normalized: CvProfile = {
    ...base,
    name: profileName,
    professional_title: cleanText(parsed.professional_title) || base.professional_title,
    personal: normalizePersonal({
      ...base.personal,
      full_name: fullName || base.personal.full_name,
      email: cleanText(parsed.personal?.email) || base.personal.email,
      phone: cleanText(parsed.personal?.phone) || base.personal.phone,
      location: cleanText(parsed.personal?.location) || base.personal.location,
      summary: cleanText(parsed.personal?.summary) || base.personal.summary,
      linkedin: '',
      website: '',
      links: links.length > 0 ? links : base.personal.links,
    }),
    experience: normalizeExperience(parsed.experience),
    education: normalizeEducation(parsed.education),
    skills: uniqueStrings(Array.isArray(parsed.skills) ? parsed.skills : [], 30),
    projects: normalizeProjects(parsed.projects),
    certifications: normalizeCertifications(parsed.certifications),
    courses: normalizeCourses(parsed.courses),
    languages: normalizeLanguages(parsed.languages),
    source_filename: sourceFilename,
  };

  if (normalized.experience.length === 0 && existingProfile?.experience?.length) {
    normalized.experience = existingProfile.experience;
  }
  if (normalized.education.length === 0 && existingProfile?.education?.length) {
    normalized.education = existingProfile.education;
  }
  if (normalized.skills.length === 0 && existingProfile?.skills?.length) {
    normalized.skills = existingProfile.skills;
  }

  return normalized;
}

function buildUnparsedFragments(rawText: string, profile: CvProfile): string[] {
  const usedBits = [
    profile.personal.summary,
    profile.professional_title,
    ...profile.skills,
    ...profile.experience.flatMap((item) => [item.title, item.company, ...item.bullets]),
    ...profile.education.flatMap((item) => [item.institution, item.degree, item.field]),
  ]
    .map((value) => value.toLowerCase())
    .filter(Boolean);

  return cleanLines(rawText)
    .filter((line) => {
      const lower = line.toLowerCase();
      if (lower.length < 20) return false;
      return !usedBits.some((bit) => bit && lower.includes(bit));
    })
    .slice(0, 8);
}

function estimateConfidence(profile: CvProfile, warnings: string[]): number {
  let score = 0.35;
  if (profile.personal.full_name) score += 0.15;
  if (profile.personal.email) score += 0.1;
  if (profile.professional_title) score += 0.1;
  if (profile.experience.length > 0) score += 0.15;
  if (profile.education.length > 0) score += 0.05;
  if (profile.skills.length > 0) score += 0.1;
  score -= Math.min(0.2, warnings.length * 0.05);
  return Math.max(0.15, Math.min(0.98, Number(score.toFixed(2))));
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parsed = await pdfParse(buffer);
  const raw = parsed.text || '';
  return raw
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function importCvFromPdf(
  buffer: Buffer,
  sourceFilename: string,
  existingProfile?: CvProfile | null,
): Promise<ImportResult> {
  const rawText = await extractPdfText(buffer);
  if (!rawText.trim()) {
    throw new Error('Could not extract readable text from this PDF. Try a text-based PDF instead of a scanned image.');
  }

  const lines = cleanLines(rawText);
  const aiParsed = await parseWithDeepSeek(rawText);
  const parsed = aiParsed ?? fallbackParse(rawText, sourceFilename);
  const warnings = uniqueStrings([
    ...(parsed.warnings ?? []),
    ...(detectColumnScramble(lines) ? ['The PDF may use multiple columns. Please review section ordering carefully.'] : []),
  ], 10);
  const profile = buildProfileFromParsed(parsed, sourceFilename, existingProfile);

  return {
    profile,
    warnings,
    confidence: estimateConfidence(profile, warnings),
    unparsed_fragments: buildUnparsedFragments(rawText, profile),
    raw_text_preview: rawText.slice(0, 1200),
    column_scramble_detected: detectColumnScramble(lines),
  };
}
