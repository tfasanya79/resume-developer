// Core CV Types (migrated from existing types/cv.ts)

export interface PersonalInfo {
  full_name: string
  email: string
  phone: string
  location: string
  summary: string
  links: LinkItem[]
}

export interface LinkItem {
  id: string
  label: string
  url: string
}

export interface ExperienceItem {
  id: string
  company: string
  title: string
  location: string
  start_date: string
  end_date: string
  current: boolean
  bullets: string[]
}

export interface EducationItem {
  id: string
  institution: string
  degree: string
  field: string
  start_date: string
  end_date: string
  details: string
}

export interface ProjectItem {
  id: string
  name: string
  description: string
  technologies: string[]
  url: string
}

export interface CertificationItem {
  id: string
  name: string
  issuer: string
  year: string
}

export interface CourseItem {
  id: string
  name: string
  provider: string
  date: string
  format: string
}

export interface LanguageItem {
  id: string
  language: string
  level: string
}

export interface CvDesign {
  accent_color: string
  font_pair: string
  photo_path?: string
}

export interface CvProfile {
  id: string
  user_id: string
  name: string
  template: string
  professional_title: string
  personal: PersonalInfo
  experience: ExperienceItem[]
  education: EducationItem[]
  skills: string[]
  projects: ProjectItem[]
  certifications: CertificationItem[]
  courses: CourseItem[]
  languages: LanguageItem[]
  section_order: string[]
  design?: CvDesign
  source_filename?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface AtsCategory {
  name: string
  score: number
  max_score: number
}

export interface AtsReport {
  score: number
  categories: AtsCategory[]
  suggestions: ImprovementSuggestion[]
  missing_keywords: string[]
}

export interface ImprovementSuggestion {
  id: string
  category: string
  message: string
  field?: string
  suggested_value?: string
}

export interface JobApplication {
  id: string
  user_id: string
  cv_id?: string
  company: string
  position: string
  location?: string
  job_url?: string
  job_description?: string
  salary_range?: string
  status: 'wishlist' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'accepted'
  applied_date?: string
  interview_date?: string
  notes?: string
  match_score?: number
  missing_keywords?: string[]
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  subscription_tier: 'free' | 'pro' | 'team' | 'enterprise'
  subscription_status?: 'active' | 'canceled' | 'past_due' | 'trialing'
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

// Helper functions
export function createEmptyCv(userId?: string): Partial<CvProfile> {
  return {
    user_id: userId,
    name: 'Untitled CV',
    template: 'modern-professional',
    professional_title: '',
    personal: {
      full_name: '',
      email: '',
      phone: '',
      location: '',
      summary: '',
      links: [],
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    courses: [],
    languages: [],
    section_order: ['personal', 'experience', 'education', 'skills', 'projects'],
    design: {
      accent_color: '#2563eb',
      font_pair: 'inter-roboto',
    },
  }
}

export function generateCvId(): string {
  return crypto.randomUUID()
}

export function generateSectionItemId(): string {
  return crypto.randomUUID()
}
