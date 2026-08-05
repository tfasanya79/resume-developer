use crate::db::models::*;
use crate::db::DbState;
use crate::error::AppResult;
use crate::export::pdf::export_cv_pdf;
use crate::import::{self, improvements::suggest_improvements};
use crate::nlp::config::OllamaConfig;
use crate::nlp::rewrite::{
    extract_keywords, generate_cover_letter as llm_generate_cover_letter, generate_interview_questions_ollama,
    rewrite_experience_bullet, score_interview_answer, tailor_cv,
};
use crate::nlp::tailor::{apply_proposal, propose_tailor};
use crate::scrapers;
use crate::semantic::ats::compute_ats_report as build_ats_report;
use crate::semantic::match_engine::compute_match_with_config;
use tauri::State;

#[tauri::command]
pub fn save_cv(state: State<DbState>, mut profile: CvProfile) -> AppResult<String> {
    save_cv_query(&state, &mut profile)
}

#[tauri::command]
pub fn load_cv(state: State<DbState>, id: String) -> AppResult<CvProfile> {
    load_cv_query(&state, &id)
}

#[tauri::command]
pub fn list_cvs(state: State<DbState>) -> AppResult<Vec<CvSummary>> {
    list_cvs_query(&state)
}

#[tauri::command]
pub fn delete_cv(state: State<DbState>, id: String) -> AppResult<()> {
    delete_cv_query(&state, &id)
}

#[tauri::command]
pub fn export_pdf(state: State<DbState>, id: String, path: String) -> AppResult<()> {
    let profile = load_cv_query(&state, &id)?;
    export_cv_pdf(&profile, &path)
}

fn save_cv_query(state: &DbState, profile: &mut CvProfile) -> AppResult<String> {
    crate::db::queries::save_cv(state, profile)
}
fn load_cv_query(state: &DbState, id: &str) -> AppResult<CvProfile> {
    crate::db::queries::load_cv(state, id)
}
fn list_cvs_query(state: &DbState) -> AppResult<Vec<CvSummary>> {
    crate::db::queries::list_cvs(state)
}
fn delete_cv_query(state: &DbState, id: &str) -> AppResult<()> {
    crate::db::queries::delete_cv(state, id)
}

#[tauri::command]
pub fn get_settings(state: State<DbState>) -> AppResult<AppSettings> {
    crate::db::queries::get_settings(&state)
}

#[tauri::command]
pub fn save_settings(state: State<DbState>, settings: AppSettings) -> AppResult<()> {
    crate::db::queries::save_settings(&state, &settings)
}

#[tauri::command]
pub fn save_application(state: State<DbState>, mut application: JobApplication) -> AppResult<String> {
    crate::db::queries::save_application(&state, &mut application)
}

#[tauri::command]
pub fn list_applications(state: State<DbState>) -> AppResult<Vec<JobApplication>> {
    crate::db::queries::list_applications(&state)
}

#[tauri::command]
pub fn delete_application(state: State<DbState>, id: String) -> AppResult<()> {
    crate::db::queries::delete_application(&state, &id)
}

#[tauri::command]
pub fn save_job_description(
    state: State<DbState>,
    mut job_description: JobDescription,
) -> AppResult<String> {
    job_description.parsed_keywords = extract_keywords(&job_description.raw_text);
    crate::db::queries::save_job_description(&state, &mut job_description)
}

#[tauri::command]
pub fn match_job_description(
    state: State<DbState>,
    cv_id: String,
    job_text: String,
) -> AppResult<MatchResult> {
    let cv = load_cv_query(&state, &cv_id)?;
    let settings = crate::db::queries::get_settings(&state)?;
    let config = OllamaConfig::from(&settings);
    Ok(compute_match_with_config(&cv, &job_text, Some(&config)))
}

#[tauri::command]
pub fn tailor_cv_for_job(
    state: State<DbState>,
    cv_id: String,
    job_text: String,
    job_id: Option<String>,
) -> AppResult<TailoredCvResult> {
    let profile = load_cv_query(&state, &cv_id)?;
    let settings = crate::db::queries::get_settings(&state)?;
    let config = OllamaConfig::from(&settings);
    let result = tailor_cv(&profile, &job_text, &config);
    let mut tailored = result.profile;
    tailored.job_id = job_id;
    let id = crate::db::queries::save_cv(&state, &mut tailored)?;
    Ok(TailoredCvResult {
        cv_id: id,
        used_ollama: result.used_ollama,
        changes_summary: if result.used_ollama {
            "CV tailored using local Ollama model".into()
        } else {
            "CV tailored using keyword-based fallback".into()
        },
    })
}

#[tauri::command]
pub fn propose_tailor_cv(
    state: State<DbState>,
    cv_id: String,
    job_text: String,
) -> AppResult<TailorProposal> {
    let profile = load_cv_query(&state, &cv_id)?;
    let settings = crate::db::queries::get_settings(&state)?;
    let config = OllamaConfig::from(&settings);
    Ok(propose_tailor(&profile, &job_text, &config))
}

#[tauri::command]
pub fn apply_tailor_proposal(
    state: State<DbState>,
    cv_id: String,
    proposal: TailorProposal,
    selected_ids: Vec<String>,
) -> AppResult<String> {
    let profile = load_cv_query(&state, &cv_id)?;
    let filtered = TailorProposal {
        changes: proposal
            .changes
            .into_iter()
            .filter(|c| selected_ids.contains(&c.id))
            .collect(),
        used_ollama: proposal.used_ollama,
        company: proposal.company,
        role: proposal.role,
    };
    let mut tailored = apply_proposal(&profile, &filtered);
    tailored.job_id = None;
    crate::db::queries::save_cv(&state, &mut tailored)
}

#[tauri::command]
pub fn generate_cover_letter(
    state: State<DbState>,
    cv_id: String,
    company: String,
    role: String,
    job_text: String,
    style: String,
) -> AppResult<CoverLetterResult> {
    let profile = load_cv_query(&state, &cv_id)?;
    let settings = crate::db::queries::get_settings(&state)?;
    let config = OllamaConfig::from(&settings);
    let (content, used_ollama) = llm_generate_cover_letter(
        &profile,
        &company,
        &role,
        &job_text,
        &style,
        &config,
    );
    Ok(CoverLetterResult {
        content,
        style,
        used_ollama,
    })
}

#[tauri::command]
pub fn run_job_scraper(
    state: State<DbState>,
    cv_id: Option<String>,
) -> AppResult<Vec<ScraperProgress>> {
    let settings = crate::db::queries::get_settings(&state)?;
    let config = OllamaConfig::from(&settings);
    let cv = if let Some(id) = cv_id {
        Some(load_cv_query(&state, &id)?)
    } else {
        None
    };
    let cv_ref = cv.as_ref();
    scrapers::run_scrapers(
        &state,
        cv_ref,
        settings.scraper_remote_ok,
        settings.scraper_remote_only,
        settings.scraper_arbeitnow,
        Some(&config),
    )
}

#[tauri::command]
pub fn list_job_listings(state: State<DbState>) -> AppResult<Vec<JobListing>> {
    crate::db::queries::list_job_listings(&state)
}

#[tauri::command]
pub fn analyze_skill_gap(
    state: State<DbState>,
    cv_id: String,
    job_text: String,
) -> AppResult<SkillGapResult> {
    let cv = load_cv_query(&state, &cv_id)?;
    let jd_skills = extract_keywords(&job_text);
    let cv_skills: Vec<String> = cv
        .skills
        .iter()
        .map(|s| s.to_lowercase())
        .collect();
    let matching: Vec<String> = jd_skills
        .iter()
        .filter(|k| cv_skills.iter().any(|s| s.contains(k.as_str())))
        .cloned()
        .collect();
    let missing: Vec<String> = jd_skills
        .iter()
        .filter(|k| !cv_skills.iter().any(|s| s.contains(k.as_str())))
        .cloned()
        .collect();
    let gap_score = if jd_skills.is_empty() {
        0.0
    } else {
        (missing.len() as f64 / jd_skills.len() as f64) * 100.0
    };
    let suggestions = missing
        .iter()
        .take(5)
        .map(|s| format!("Consider learning or highlighting: {s}"))
        .collect();
    Ok(SkillGapResult {
        gap_score,
        missing_skills: missing,
        matching_skills: matching,
        suggestions,
    })
}

#[tauri::command]
pub fn generate_interview_questions(
    state: State<DbState>,
    cv_id: String,
    job_text: String,
) -> AppResult<InterviewSession> {
    let cv = load_cv_query(&state, &cv_id)?;
    let settings = crate::db::queries::get_settings(&state)?;
    let config = OllamaConfig::from(&settings);

    let mut questions = generate_interview_questions_ollama(&cv, &job_text, &config).unwrap_or_default();

    if questions.is_empty() {
        let role = cv
            .experience
            .first()
            .map(|e| e.title.clone())
            .unwrap_or_else(|| "this role".into());
        questions = vec![
            InterviewQuestion {
                question: "Tell me about a time you faced a significant challenge at work.".into(),
                category: "behavioral".into(),
                tip: "Use the STAR method: Situation, Task, Action, Result.".into(),
            },
            InterviewQuestion {
                question: format!("Why are you interested in a {role} position?"),
                category: "behavioral".into(),
                tip: "Connect your experience to the role requirements.".into(),
            },
        ];
        let keywords = extract_keywords(&job_text);
        for kw in keywords.iter().take(4) {
            questions.push(InterviewQuestion {
                question: format!("How would you apply your experience with {kw} in this role?"),
                category: "technical".into(),
                tip: format!("Prepare a concrete example involving {kw}."),
            });
        }
    }

    let session = InterviewSession {
        id: uuid::Uuid::new_v4().to_string(),
        questions,
        notes: String::new(),
        score: None,
    };
    crate::db::queries::save_interview_session(&state, &session)?;
    Ok(session)
}

#[tauri::command]
pub fn optimize_linkedin(
    headline: String,
    summary: String,
    experience_text: String,
) -> AppResult<LinkedInOptimization> {
    let improvements = vec![
        "Add quantifiable achievements to your headline.".into(),
        "Lead your summary with your unique value proposition.".into(),
        "Use action verbs at the start of each experience bullet.".into(),
    ];

    let headline_suggestion = if headline.len() < 40 {
        format!("{headline} | Driving results through expertise & leadership")
    } else {
        headline.clone()
    };

    let summary_suggestion = if summary.len() < 100 {
        format!(
            "{summary}\n\nPassionate professional with a track record of delivering measurable impact. \
             Open to connecting with like-minded professionals."
        )
    } else {
        summary.clone()
    };

    let exp_suggestions: Vec<String> = experience_text
        .lines()
        .filter(|l| !l.trim().is_empty())
        .take(5)
        .map(|l| format!("• Improved: {l}"))
        .collect();

    Ok(LinkedInOptimization {
        headline: headline_suggestion,
        summary: summary_suggestion,
        experience_suggestions: exp_suggestions,
        improvements,
    })
}

#[tauri::command]
pub fn get_salary_insights(role: String, region: String) -> AppResult<SalaryInsight> {
    let base = match role.to_lowercase().as_str() {
        s if s.contains("senior") || s.contains("lead") => (90000, 160000, 125000),
        s if s.contains("junior") || s.contains("entry") => (45000, 75000, 58000),
        _ => (60000, 110000, 85000),
    };

    let multiplier = match region.to_lowercase().as_str() {
        s if s.contains("san francisco") || s.contains("new york") => 1.3,
        s if s.contains("london") => 1.2,
        s if s.contains("remote") => 1.0,
        _ => 0.9,
    };

    Ok(SalaryInsight {
        role: role.clone(),
        region: region.clone(),
        min_salary: (base.0 as f64 * multiplier) as i64,
        max_salary: (base.1 as f64 * multiplier) as i64,
        median_salary: (base.2 as f64 * multiplier) as i64,
        currency: "USD".into(),
        negotiation_tips: vec![
            "Research comparable salaries in your region before negotiating.".into(),
            "Anchor your request to market data and your specific achievements.".into(),
            "Consider total compensation, not just base salary.".into(),
        ],
    })
}

#[tauri::command]
pub fn export_portfolio(
    state: State<DbState>,
    cv_id: String,
    path: String,
) -> AppResult<()> {
    let cv = load_cv_query(&state, &cv_id)?;
    let html = format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{name} - Portfolio</title>
  <style>
    body {{ font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }}
    h1 {{ color: #1e40af; }} h2 {{ border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }}
    .skills span {{ background: #dbeafe; padding: 0.25rem 0.75rem; border-radius: 999px; margin: 0.25rem; display: inline-block; }}
    .project {{ margin-bottom: 1.5rem; }}
  </style>
</head>
<body>
  <h1>{name}</h1>
  <p>{summary}</p>
  <p>{email} | {location}</p>
  <h2>Skills</h2>
  <div class="skills">{skills}</div>
  <h2>Experience</h2>
  {experience}
  <h2>Projects</h2>
  {projects}
  <h2>Contact</h2>
  <p>Email: {email}</p>
</body>
</html>"#,
        name = cv.personal.full_name,
        summary = cv.personal.summary,
        email = cv.personal.email,
        location = cv.personal.location,
        skills = cv.skills.iter().map(|s| format!("<span>{s}</span>")).collect::<Vec<_>>().join(""),
        experience = cv.experience.iter().map(|e| format!(
            "<div><h3>{} at {}</h3><ul>{}</ul></div>",
            e.title, e.company,
            e.bullets.iter().map(|b| format!("<li>{b}</li>")).collect::<Vec<_>>().join("")
        )).collect::<Vec<_>>().join(""),
        projects = cv.projects.iter().map(|p| format!(
            "<div class=\"project\"><h3>{}</h3><p>{}</p></div>",
            p.name, p.description
        )).collect::<Vec<_>>().join(""),
    );
    std::fs::write(path, html)?;
    Ok(())
}

#[tauri::command]
pub fn import_cv_pdf(state: State<DbState>, path: String) -> AppResult<ImportResult> {
    let settings = crate::db::queries::get_settings(&state)?;
    let config = OllamaConfig::from(&settings);
    import::import_cv_from_pdf(&path, &config)
}

#[tauri::command]
pub fn suggest_cv_improvements(state: State<DbState>, cv_id: String) -> AppResult<ImprovementReport> {
    let profile = load_cv_query(&state, &cv_id)?;
    Ok(suggest_improvements(&profile))
}

#[tauri::command]
pub fn compute_ats_report(
    profile: CvProfile,
    job_text: Option<String>,
) -> AppResult<AtsReport> {
    Ok(build_ats_report(
        &profile,
        job_text.as_deref(),
    ))
}

#[tauri::command]
pub fn rewrite_experience_bullet_cmd(
    state: State<DbState>,
    bullet: String,
    context: String,
    mode: String,
) -> AppResult<BulletRewriteResult> {
    let settings = crate::db::queries::get_settings(&state)?;
    let config = OllamaConfig::from(&settings);
    Ok(rewrite_experience_bullet(&bullet, &context, &mode, &config))
}

#[tauri::command]
pub fn list_interview_sessions(state: State<DbState>) -> AppResult<Vec<InterviewSession>> {
    crate::db::queries::list_interview_sessions(&state)
}

#[tauri::command]
pub fn score_interview_answer_cmd(
    state: State<DbState>,
    question: String,
    answer: String,
) -> AppResult<InterviewAnswerScore> {
    let settings = crate::db::queries::get_settings(&state)?;
    let config = OllamaConfig::from(&settings);
    Ok(score_interview_answer(&question, &answer, &config))
}

#[tauri::command]
pub fn debug_log_line(line: String) -> AppResult<()> {
    use std::fs::OpenOptions;
    use std::io::Write;
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("debug-ad61b5.log");
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{line}");
    }
    Ok(())
}
