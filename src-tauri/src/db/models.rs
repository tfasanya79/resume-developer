use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinkItem {
    pub id: String,
    pub label: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalInfo {
    pub full_name: String,
    pub email: String,
    pub phone: String,
    pub location: String,
    pub summary: String,
    pub linkedin: String,
    pub website: String,
    #[serde(default)]
    pub links: Vec<LinkItem>,
}

impl Default for PersonalInfo {
    fn default() -> Self {
        Self {
            full_name: String::new(),
            email: String::new(),
            phone: String::new(),
            location: String::new(),
            summary: String::new(),
            linkedin: String::new(),
            website: String::new(),
            links: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperienceItem {
    pub id: String,
    pub company: String,
    pub title: String,
    pub location: String,
    pub start_date: String,
    pub end_date: String,
    pub current: bool,
    pub bullets: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EducationItem {
    pub id: String,
    pub institution: String,
    pub degree: String,
    pub field: String,
    pub start_date: String,
    pub end_date: String,
    pub details: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectItem {
    pub id: String,
    pub name: String,
    pub description: String,
    pub technologies: Vec<String>,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CertificationItem {
    pub id: String,
    pub name: String,
    pub issuer: String,
    pub year: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CourseItem {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub date: String,
    pub format: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageItem {
    pub id: String,
    pub language: String,
    pub level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CvDesign {
    pub accent_color: String,
    pub font_pair: String,
    pub photo_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CvProfile {
    pub id: String,
    pub name: String,
    pub template: String,
    pub parent_cv_id: Option<String>,
    pub job_id: Option<String>,
    pub section_order: Vec<String>,
    pub professional_title: String,
    pub personal: PersonalInfo,
    pub experience: Vec<ExperienceItem>,
    pub education: Vec<EducationItem>,
    pub skills: Vec<String>,
    pub projects: Vec<ProjectItem>,
    pub certifications: Vec<CertificationItem>,
    #[serde(default)]
    pub courses: Vec<CourseItem>,
    pub languages: Vec<LanguageItem>,
    pub competence_notes: Vec<String>,
    #[serde(default)]
    pub design: CvDesign,
    pub source_filename: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Default for CvProfile {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: "Untitled CV".into(),
            template: "modern-professional".into(),
            parent_cv_id: None,
            job_id: None,
            section_order: vec![
                "personal".into(),
                "experience".into(),
                "education".into(),
                "skills".into(),
                "certifications".into(),
                "courses".into(),
                "projects".into(),
                "languages".into(),
            ],
            professional_title: String::new(),
            personal: PersonalInfo::default(),
            experience: Vec::new(),
            education: Vec::new(),
            skills: Vec::new(),
            projects: Vec::new(),
            certifications: Vec::new(),
            courses: Vec::new(),
            languages: Vec::new(),
            competence_notes: Vec::new(),
            design: CvDesign::default(),
            source_filename: None,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub profile: CvProfile,
    pub warnings: Vec<String>,
    pub confidence: f64,
    pub unparsed_fragments: Vec<String>,
    pub raw_text_preview: String,
    #[serde(default)]
    pub column_scramble_detected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImprovementSuggestion {
    pub id: String,
    pub category: String,
    pub message: String,
    pub field: Option<String>,
    pub suggested_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImprovementReport {
    pub suggestions: Vec<ImprovementSuggestion>,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AtsCategory {
    pub name: String,
    pub score: f64,
    pub max_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AtsReport {
    pub score: f64,
    pub categories: Vec<AtsCategory>,
    pub suggestions: Vec<ImprovementSuggestion>,
    pub missing_keywords: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TailorChange {
    pub id: String,
    pub path: String,
    pub before: String,
    pub after: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TailorProposal {
    pub changes: Vec<TailorChange>,
    pub used_ollama: bool,
    pub company: String,
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BulletRewriteResult {
    pub original: String,
    pub rewritten: String,
    pub used_ollama: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterviewAnswerScore {
    pub score: f64,
    pub feedback: String,
    pub star_completeness: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CvSummary {
    pub id: String,
    pub name: String,
    pub template: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub default_template: String,
    pub export_path: String,
    pub ollama_url: String,
    pub ollama_model: String,
    pub ollama_temperature: f64,
    pub embed_model: String,
    pub scraper_remote_ok: bool,
    pub scraper_remote_only: bool,
    pub scraper_arbeitnow: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            default_template: "modern-professional".to_string(),
            export_path: String::new(),
            ollama_url: "http://localhost:11434".to_string(),
            ollama_model: "llama3.2".to_string(),
            ollama_temperature: 0.3,
            embed_model: "nomic-embed-text".to_string(),
            scraper_remote_ok: true,
            scraper_remote_only: false,
            scraper_arbeitnow: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobApplication {
    pub id: String,
    pub title: String,
    pub company: String,
    pub status: String,
    pub notes: String,
    pub cv_version_id: Option<String>,
    pub applied_at: Option<String>,
    pub reminder_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobDescription {
    pub id: String,
    pub raw_text: String,
    pub parsed_keywords: Vec<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchResult {
    pub score: f64,
    pub matched_keywords: Vec<String>,
    pub missing_keywords: Vec<String>,
    pub section_scores: Vec<SectionScore>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SectionScore {
    pub section: String,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobListing {
    pub id: String,
    pub title: String,
    pub company: String,
    pub location: String,
    pub salary: String,
    pub url: String,
    pub description: String,
    pub source: String,
    pub match_score: Option<f64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TailoredCvResult {
    pub cv_id: String,
    pub used_ollama: bool,
    pub changes_summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoverLetterResult {
    pub content: String,
    pub style: String,
    pub used_ollama: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillGapResult {
    pub gap_score: f64,
    pub missing_skills: Vec<String>,
    pub matching_skills: Vec<String>,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterviewQuestion {
    pub question: String,
    pub category: String,
    pub tip: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterviewSession {
    pub id: String,
    pub questions: Vec<InterviewQuestion>,
    pub notes: String,
    pub score: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinkedInOptimization {
    pub headline: String,
    pub summary: String,
    pub experience_suggestions: Vec<String>,
    pub improvements: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalaryInsight {
    pub role: String,
    pub region: String,
    pub min_salary: i64,
    pub max_salary: i64,
    pub median_salary: i64,
    pub currency: String,
    pub negotiation_tips: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScraperProgress {
    pub source: String,
    pub fetched: usize,
    pub message: String,
}
