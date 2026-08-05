use crate::db::models::{AtsCategory, AtsReport, CvProfile, ImprovementSuggestion};
use crate::import::improvements::suggest_improvements;
use crate::nlp::rewrite::extract_keywords;
use crate::semantic::match_engine::compute_match;
use std::collections::HashSet;
use uuid::Uuid;

pub fn compute_ats_report(profile: &CvProfile, job_text: Option<&str>) -> AtsReport {
    let improvement = suggest_improvements(profile);
    let mut categories = vec![
        score_contact(profile),
        score_sections(profile),
        score_bullets(profile),
    ];

    let mut missing_keywords = Vec::new();
    if let Some(jd) = job_text.filter(|t| !t.trim().is_empty()) {
        let match_result = compute_match(profile, jd);
        missing_keywords = match_result.missing_keywords.clone();
        let keyword_score = match_result.score;
        categories.push(AtsCategory {
            name: "job_keywords".into(),
            score: keyword_score,
            max_score: 100.0,
        });
    }

    let category_avg = if categories.is_empty() {
        improvement.score
    } else {
        categories.iter().map(|c| c.score).sum::<f64>() / categories.len() as f64
    };

    let score = (category_avg * 0.6 + improvement.score * 0.4).clamp(0.0, 100.0);

    AtsReport {
        score,
        categories,
        suggestions: improvement.suggestions,
        missing_keywords,
    }
}

fn score_contact(profile: &CvProfile) -> AtsCategory {
    let mut score = 0.0;
    if !profile.personal.full_name.is_empty() {
        score += 25.0;
    }
    if !profile.personal.email.is_empty() {
        score += 25.0;
    }
    if !profile.personal.phone.is_empty() {
        score += 25.0;
    }
    if !profile.personal.location.is_empty() {
        score += 25.0;
    }
    AtsCategory {
        name: "contact".into(),
        score,
        max_score: 100.0,
    }
}

fn score_sections(profile: &CvProfile) -> AtsCategory {
    let checks = [
        !profile.personal.summary.is_empty(),
        !profile.experience.is_empty(),
        profile.skills.len() >= 5,
        !profile.education.is_empty(),
    ];
    let score = (checks.iter().filter(|&&c| c).count() as f64 / checks.len() as f64) * 100.0;
    AtsCategory {
        name: "sections".into(),
        score,
        max_score: 100.0,
    }
}

fn score_bullets(profile: &CvProfile) -> AtsCategory {
    let mut total = 0;
    let mut good = 0;
    for exp in &profile.experience {
        for bullet in &exp.bullets {
            if bullet.is_empty() {
                continue;
            }
            total += 1;
            let lower = bullet.to_lowercase();
            let has_verb = [
                "led", "managed", "developed", "created", "implemented", "designed", "built",
                "improved", "delivered",
            ]
            .iter()
            .any(|v| lower.starts_with(v));
            let has_metric = bullet.chars().any(|c| c.is_ascii_digit());
            if has_verb && has_metric {
                good += 1;
            } else if has_verb || has_metric {
                good += 1;
            }
        }
    }
    let score = if total == 0 {
        50.0
    } else {
        (good as f64 / total as f64) * 100.0
    };
    AtsCategory {
        name: "bullets".into(),
        score,
        max_score: 100.0,
    }
}

pub fn build_bullet_suggestions(profile: &CvProfile) -> Vec<ImprovementSuggestion> {
    let mut out = Vec::new();
    for exp in &profile.experience {
        for bullet in &exp.bullets {
            if bullet.is_empty() {
                continue;
            }
            let lower = bullet.to_lowercase();
            if !lower.starts_with("led")
                && !lower.starts_with("managed")
                && !lower.starts_with("developed")
            {
                out.push(ImprovementSuggestion {
                    id: Uuid::new_v4().to_string(),
                    category: "bullet_quality".into(),
                    message: format!("Improve bullet: \"{}\"", truncate(bullet, 40)),
                    field: Some(format!("experience.{}.bullets", exp.id)),
                    suggested_value: Some(bullet.clone()),
                });
            }
        }
    }
    out.into_iter().take(3).collect()
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}...", &s[..max])
    }
}

pub fn extract_job_metadata(job_text: &str) -> (String, String) {
    let lines: Vec<&str> = job_text.lines().filter(|l| !l.trim().is_empty()).collect();
    let role = lines.first().unwrap_or(&"Role").trim().to_string();
    let company = lines
        .iter()
        .find(|l| l.to_lowercase().contains("company") || l.contains(" at "))
        .map(|l| {
            l.replace("Company:", "")
                .replace("company:", "")
                .trim()
                .to_string()
        })
        .unwrap_or_else(|| "Company".to_string());
    (company, role)
}

pub fn jd_keyword_set(job_text: &str) -> HashSet<String> {
    extract_keywords(job_text).into_iter().collect()
}
