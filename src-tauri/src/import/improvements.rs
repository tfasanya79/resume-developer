use crate::db::models::{CvProfile, ImprovementReport, ImprovementSuggestion};
use uuid::Uuid;

const ACTION_VERBS: &[&str] = &[
    "led", "managed", "developed", "created", "implemented", "designed", "built",
    "improved", "delivered", "conducted", "provided", "utilized", "leveraged",
    "performed", "maintained", "collaborated", "applied", "coached",
];

pub fn suggest_improvements(profile: &CvProfile) -> ImprovementReport {
    let mut suggestions = Vec::new();
    let mut score = 100.0_f64;

    if profile.personal.summary.is_empty() {
        score -= 15.0;
        suggestions.push(ImprovementSuggestion {
            id: Uuid::new_v4().to_string(),
            category: "missing_section".into(),
            message: "Add a professional summary to introduce yourself".into(),
            field: Some("personal.summary".into()),
            suggested_value: None,
        });
    }
    if profile.personal.email.is_empty() {
        score -= 10.0;
        suggestions.push(ImprovementSuggestion {
            id: Uuid::new_v4().to_string(),
            category: "ats".into(),
            message: "Add an email address for recruiters".into(),
            field: Some("personal.email".into()),
            suggested_value: None,
        });
    }
    if profile.personal.phone.is_empty() {
        score -= 5.0;
        suggestions.push(ImprovementSuggestion {
            id: Uuid::new_v4().to_string(),
            category: "ats".into(),
            message: "Add a phone number".into(),
            field: Some("personal.phone".into()),
            suggested_value: None,
        });
    }
    if profile.professional_title.is_empty() {
        score -= 5.0;
        suggestions.push(ImprovementSuggestion {
            id: Uuid::new_v4().to_string(),
            category: "ats".into(),
            message: "Add a professional title line under your name".into(),
            field: Some("professional_title".into()),
            suggested_value: None,
        });
    }
    if profile.skills.len() < 5 {
        score -= 10.0;
        suggestions.push(ImprovementSuggestion {
            id: Uuid::new_v4().to_string(),
            category: "keywords".into(),
            message: "Add more skills (aim for 8–15 relevant keywords)".into(),
            field: Some("skills".into()),
            suggested_value: None,
        });
    }
    if profile.certifications.is_empty() {
        score -= 5.0;
        suggestions.push(ImprovementSuggestion {
            id: Uuid::new_v4().to_string(),
            category: "missing_section".into(),
            message: "List certifications to strengthen credibility".into(),
            field: Some("certifications".into()),
            suggested_value: None,
        });
    }

    for exp in &profile.experience {
        for (bi, bullet) in exp.bullets.iter().enumerate() {
            if bullet.is_empty() {
                continue;
            }
            let lower = bullet.to_lowercase();
            let starts_with_verb = ACTION_VERBS.iter().any(|v| lower.starts_with(v));
            if !starts_with_verb {
                score -= 2.0;
                let improved = if lower.chars().next().map(|c| c.is_lowercase()).unwrap_or(false) {
                    format!("Led {}", lower)
                } else {
                    format!("Led {lower}")
                };
                suggestions.push(ImprovementSuggestion {
                    id: Uuid::new_v4().to_string(),
                    category: "bullet_quality".into(),
                    message: format!("Start bullet with an action verb: \"{}\"", truncate(bullet, 50)),
                    field: Some(format!("experience.{}.bullet.{}", exp.id, bi)),
                    suggested_value: Some(improved),
                });
            }
            let has_number = bullet.chars().any(|c| c.is_ascii_digit());
            if !has_number {
                suggestions.push(ImprovementSuggestion {
                    id: Uuid::new_v4().to_string(),
                    category: "bullet_quality".into(),
                    message: format!("Add metrics where possible: \"{}\"", truncate(bullet, 50)),
                    field: None,
                    suggested_value: None,
                });
            }
        }
    }

    ImprovementReport {
        suggestions: suggestions.into_iter().take(15).collect(),
        score: score.clamp(0.0, 100.0),
    }
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}...", &s[..max])
    }
}
