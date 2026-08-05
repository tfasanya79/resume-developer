use crate::db::models::{CvProfile, MatchResult, SectionScore};
use crate::nlp::config::OllamaConfig;
use crate::nlp::rewrite::extract_keywords;
use crate::semantic::embeddings::{cosine_similarity, embed_text};
use crate::semantic::synonyms::{expand_keywords, keyword_in_text};

pub fn compute_match(cv: &CvProfile, job_text: &str) -> MatchResult {
    compute_match_with_config(cv, job_text, None)
}

pub fn compute_match_with_config(
    cv: &CvProfile,
    job_text: &str,
    config: Option<&OllamaConfig>,
) -> MatchResult {
    let jd_keywords = extract_keywords(job_text);
    let expanded_jd = expand_keywords(&jd_keywords);
    let cv_text = cv_to_text(cv);

    let matched: Vec<String> = jd_keywords
        .iter()
        .filter(|k| keyword_in_text(k, &cv_text))
        .cloned()
        .collect();
    let missing: Vec<String> = jd_keywords
        .iter()
        .filter(|k| !keyword_in_text(k, &cv_text))
        .cloned()
        .collect();

    let keyword_score = if jd_keywords.is_empty() {
        0.0
    } else {
        (matched.len() as f64 / jd_keywords.len() as f64) * 100.0
    };

    let mut semantic_score = keyword_score;
    if let Some(cfg) = config {
        if let (Some(cv_emb), Some(jd_emb)) = (
            embed_text(&cv_text, cfg),
            embed_text(job_text, cfg),
        ) {
            semantic_score = cosine_similarity(&cv_emb, &jd_emb) * 100.0;
        }
    }

    let score = semantic_score * 0.6 + keyword_score * 0.4;

    let section_scores = vec![
        score_section("experience", &cv.experience.iter().map(|e| format!("{} {}", e.title, e.bullets.join(" "))).collect::<Vec<_>>().join(" "), &expanded_jd),
        score_section("skills", &cv.skills.join(" "), &expanded_jd),
        score_section("education", &cv.education.iter().map(|e| format!("{} {}", e.degree, e.field)).collect::<Vec<_>>().join(" "), &expanded_jd),
        score_section("projects", &cv.projects.iter().map(|p| format!("{} {}", p.name, p.description)).collect::<Vec<_>>().join(" "), &expanded_jd),
    ];

    MatchResult {
        score,
        matched_keywords: matched,
        missing_keywords: missing,
        section_scores,
    }
}

fn cv_to_text(cv: &CvProfile) -> String {
    let mut parts = vec![
        cv.personal.summary.clone(),
        cv.skills.join(" "),
        cv.professional_title.clone(),
    ];
    for exp in &cv.experience {
        parts.push(format!("{} {} {}", exp.title, exp.company, exp.bullets.join(" ")));
    }
    for edu in &cv.education {
        parts.push(format!("{} {} {}", edu.degree, edu.field, edu.institution));
    }
    for proj in &cv.projects {
        parts.push(format!("{} {} {}", proj.name, proj.description, proj.technologies.join(" ")));
    }
    parts.join(" ")
}

fn score_section(section: &str, text: &str, jd_keywords: &[String]) -> SectionScore {
    let matched = jd_keywords
        .iter()
        .filter(|k| keyword_in_text(k, text))
        .count();
    let score = if jd_keywords.is_empty() {
        0.0
    } else {
        (matched as f64 / jd_keywords.len() as f64) * 100.0
    };
    SectionScore {
        section: section.to_string(),
        score,
    }
}
