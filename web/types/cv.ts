export interface PersonalInfo {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  /** @deprecated use links[] */
  linkedin: string;
  /** @deprecated use links[] */
  website: string;
  links: LinkItem[];
}

export interface LinkItem {
  id: string;
  label: string;
  url: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  current: boolean;
  bullets: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field: string;
  start_date: string;
  end_date: string;
  details: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  url: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  year: string;
}

export interface CourseItem {
  id: string;
  name: string;
  provider: string;
  date: string;
  format: string;
}

export interface LanguageItem {
  id: string;
  language: string;
  level: string;
}

export interface CvDesign {
  accent_color: string;
  font_pair: string;
  photo_path: string;
}

export interface CvProfile {
  id: string;
  name: string;
  template: string;
  parent_cv_id?: string | null;
  job_id?: string | null;
  section_order: string[];
  professional_title: string;
  personal: PersonalInfo;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  courses: CourseItem[];
  languages: LanguageItem[];
  competence_notes: string[];
  design?: CvDesign;
  source_filename?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportResult {
  profile: CvProfile;
  warnings: string[];
  confidence: number;
  unparsed_fragments: string[];
  raw_text_preview: string;
  column_scramble_detected?: boolean;
}

export interface ImprovementSuggestion {
  id: string;
  category: string;
  message: string;
  field?: string | null;
  suggested_value?: string | null;
}

export interface ImprovementReport {
  suggestions: ImprovementSuggestion[];
  score: number;
}

export interface AtsCategory {
  name: string;
  score: number;
  max_score: number;
}

export interface AtsReport {
  score: number;
  categories: AtsCategory[];
  suggestions: ImprovementSuggestion[];
  missing_keywords: string[];
}

export interface TailorChange {
  id: string;
  path: string;
  before: string;
  after: string;
  reason: string;
}

export interface TailorProposal {
  changes: TailorChange[];
  used_ai: boolean;
  company: string;
  role: string;
}

export interface BulletRewriteResult {
  original: string;
  rewritten: string;
  used_ai: boolean;
}

export interface InterviewAnswerScore {
  score: number;
  feedback: string;
  star_completeness: string;
  used_ai?: boolean;
}

export interface CvSummary {
  id: string;
  name: string;
  template: string;
  updated_at: string;
}

export interface AppSettings {
  theme: string;
  default_template: string;
  export_path: string;
  ollama_url: string;
  ollama_model: string;
  ollama_temperature: number;
  embed_model: string;
  scraper_remote_ok: boolean;
  scraper_remote_only: boolean;
  scraper_arbeitnow: boolean;
}

export interface JobApplication {
  id: string;
  title: string;
  company: string;
  status: string;
  notes: string;
  cv_version_id?: string | null;
  applied_at?: string | null;
  reminder_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchResult {
  score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  section_scores: { section: string; score: number }[];
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  url: string;
  description: string;
  source: string;
  match_score?: number | null;
  created_at: string;
}

export interface SkillGapResult {
  gap_score: number;
  missing_skills: string[];
  matching_skills: string[];
  suggestions: string[];
}

export interface InterviewQuestion {
  question: string;
  category: string;
  tip: string;
}

export interface InterviewSession {
  id: string;
  questions: InterviewQuestion[];
  notes: string;
  score?: number | null;
}

export interface LinkedInOptimization {
  headline: string;
  summary: string;
  experience_suggestions: string[];
  improvements: string[];
  skills_suggestions?: string[];
}

export interface SalaryInsight {
  role: string;
  region: string;
  min_salary: number;
  max_salary: number;
  median_salary: number;
  currency: string;
  negotiation_tips: string[];
}

export interface ScraperProgress {
  source: string;
  fetched: number;
  message: string;
}

export const DEFAULT_SECTION_ORDER = [
  "personal",
  "experience",
  "education",
  "skills",
  "certifications",
  "courses",
  "projects",
  "languages",
];

export const CONTENT_SECTION_IDS = [
  "experience",
  "education",
  "skills",
  "certifications",
  "courses",
  "projects",
  "languages",
] as const;

export const COURSE_FORMAT_OPTIONS = [
  "Live Classroom",
  "Online - Tutor-led",
  "Online - Self-paced",
  "Hybrid",
  "Workshop / Bootcamp",
  "Custom",
] as const;

export function normalizeSectionOrder(order: string[]): string[] {
  const next = [...order];
  for (const section of CONTENT_SECTION_IDS) {
    if (!next.includes(section)) {
      const certIdx = next.indexOf("certifications");
      if (section === "courses" && certIdx >= 0) {
        next.splice(certIdx + 1, 0, section);
      } else {
        next.push(section);
      }
    }
  }
  return next;
}

export function suggestLabelFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("linkedin.com")) return "LinkedIn";
  if (lower.includes("credly.com")) return "Credly";
  if (lower.includes("github.com")) return "GitHub";
  if (lower.includes("gitlab.com")) return "GitLab";
  if (lower.includes("twitter.com") || lower.includes("x.com")) return "Twitter";
  if (lower.includes("medium.com")) return "Medium";
  if (lower.includes("stackoverflow.com")) return "Stack Overflow";
  return "Website";
}

export function migratePersonalLinks(personal: PersonalInfo): PersonalInfo {
  const links = personal.links ?? [];
  if (links.length > 0) {
    return { ...personal, links };
  }
  const migrated: LinkItem[] = [];
  if (personal.linkedin?.trim()) {
    migrated.push({
      id: crypto.randomUUID(),
      label: "LinkedIn",
      url: personal.linkedin.trim(),
    });
  }
  if (personal.website?.trim()) {
    migrated.push({
      id: crypto.randomUUID(),
      label: suggestLabelFromUrl(personal.website),
      url: personal.website.trim(),
    });
  }
  return { ...personal, links: migrated };
}

export function normalizePersonal(personal: PersonalInfo): PersonalInfo {
  return migratePersonalLinks({
    ...personal,
    links: personal.links ?? [],
  });
}

export const CV_TEMPLATES = [
  { id: "modern-professional", name: "Modern Professional" },
  { id: "ats-optimized", name: "ATS Optimized" },
  { id: "minimalist", name: "Minimalist" },
  { id: "creative", name: "Creative" },
  { id: "executive", name: "Executive" },
  { id: "one-page", name: "One Page" },
  { id: "tech-focus", name: "Tech Focus" },
  { id: "academic", name: "Academic" },
  { id: "healthcare", name: "Healthcare" },
  { id: "sales", name: "Sales" },
  { id: "startup", name: "Startup" },
  { id: "classic-serif", name: "Classic Serif" },
  { id: "bold-modern", name: "Bold Modern" },
  { id: "compact-grid", name: "Compact Grid" },
];

export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
];

export function createEmptyCv(name = "Untitled CV"): CvProfile {
  return {
    id: "",
    name,
    template: "modern-professional",
    section_order: [...DEFAULT_SECTION_ORDER],
    professional_title: "",
    personal: {
      full_name: "",
      email: "",
      phone: "",
      location: "",
      summary: "",
      linkedin: "",
      website: "",
      links: [],
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    courses: [],
    languages: [],
    competence_notes: [],
    design: { accent_color: "#2563eb", font_pair: "system", photo_path: "" },
    created_at: "",
    updated_at: "",
  };
}

export function newId(): string {
  return crypto.randomUUID();
}

// =====================================================
// APPLICATION TRACKER (matches supabase `job_applications` table)
// =====================================================

export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "interviewing"
  | "offered"
  | "rejected"
  | "accepted";

export const APPLICATION_STATUS_COLUMNS: { id: ApplicationStatus; label: string }[] = [
  { id: "wishlist", label: "Wishlist" },
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "offered", label: "Offered" },
  { id: "rejected", label: "Rejected" },
  { id: "accepted", label: "Accepted" },
];

export interface JobApplicationRecord {
  id: string;
  cv_id: string | null;
  company: string;
  position: string;
  location: string | null;
  job_url: string | null;
  job_description: string | null;
  salary_range: string | null;
  status: ApplicationStatus;
  applied_date: string | null;
  interview_date: string | null;
  offer_date: string | null;
  rejection_date: string | null;
  notes: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  follow_up_date: string | null;
  match_score: number | null;
  missing_keywords: string[] | null;
  created_at: string;
  updated_at: string;
}

export type NewJobApplication = Partial<
  Omit<JobApplicationRecord, "id" | "created_at" | "updated_at">
> & {
  company: string;
  position: string;
};

