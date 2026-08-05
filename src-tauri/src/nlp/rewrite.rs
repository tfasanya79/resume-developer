use crate::db::models::{BulletRewriteResult, CvProfile};
use crate::nlp::config::{strip_json_fences, OllamaConfig};
use crate::nlp::fallback::{generate_cover_letter_fallback, tailor_cv_fallback};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct OllamaResponse {
    response: String,
}

pub fn ollama_available(url: &str) -> bool {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build();
    if let Ok(client) = client {
        client.get(format!("{url}/api/tags")).send().is_ok()
    } else {
        false
    }
}

fn ollama_generate(prompt: &str, config: &OllamaConfig, json: bool) -> Option<String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .ok()?;
    let mut body = serde_json::json!({
        "model": config.model,
        "prompt": prompt,
        "stream": false,
        "options": { "temperature": config.temperature }
    });
    if json {
        body["format"] = serde_json::json!("json");
    }
    let response = client
        .post(format!("{}/api/generate", config.url))
        .json(&body)
        .send()
        .ok()?;
    let ollama: OllamaResponse = response.json().ok()?;
    Some(strip_json_fences(&ollama.response))
}

pub fn rewrite_experience_bullet(
    bullet: &str,
    context: &str,
    mode: &str,
    config: &OllamaConfig,
) -> BulletRewriteResult {
    if bullet.trim().is_empty() {
        return BulletRewriteResult {
            original: bullet.to_string(),
            rewritten: bullet.to_string(),
            used_ollama: false,
        };
    }
    if !ollama_available(&config.url) {
        return BulletRewriteResult {
            original: bullet.to_string(),
            rewritten: fallback_bullet(bullet, mode),
            used_ollama: false,
        };
    }
    let instruction = match mode {
        "metrics" => "Add quantifiable metrics while keeping facts truthful.",
        "keywords" => "Naturally incorporate relevant job keywords.",
        _ => "Rewrite using STAR format with strong action verbs.",
    };
    let prompt = format!(
        "{instruction} Return ONLY JSON: {{\"rewritten\":\"...\"}}\nContext: {context}\nBullet: {bullet}"
    );
    if let Some(raw) = ollama_generate(&prompt, config, true) {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
            if let Some(r) = v.get("rewritten").and_then(|x| x.as_str()) {
                return BulletRewriteResult {
                    original: bullet.to_string(),
                    rewritten: r.to_string(),
                    used_ollama: true,
                };
            }
        }
    }
    BulletRewriteResult {
        original: bullet.to_string(),
        rewritten: fallback_bullet(bullet, mode),
        used_ollama: false,
    }
}

fn fallback_bullet(bullet: &str, mode: &str) -> String {
    match mode {
        "metrics" if !bullet.chars().any(|c| c.is_ascii_digit()) => {
            format!("{bullet}, improving outcomes by 15%")
        }
        _ if !bullet.to_lowercase().starts_with("led")
            && !bullet.to_lowercase().starts_with("managed") =>
        {
            format!("Led {bullet}")
        }
        _ => bullet.to_string(),
    }
}

pub fn tailor_cv_with_ollama(
    profile: &CvProfile,
    job_description: &str,
    config: &OllamaConfig,
) -> Option<CvProfile> {
    if !ollama_available(&config.url) {
        return None;
    }
    let prompt = format!(
        "Rewrite experience bullets to match the job. Return ONLY valid JSON of the full CV profile.\nJob: {job_description}\n\nCV: {}",
        serde_json::to_string(profile).ok()?
    );
    let raw = ollama_generate(&prompt, config, true)?;
    let mut tailored: CvProfile = serde_json::from_str(&raw)
        .unwrap_or_else(|_| tailor_cv_fallback(profile, &extract_keywords(job_description)));
    tailored.id = String::new();
    tailored.parent_cv_id = Some(profile.id.clone());
    tailored.name = format!("{} (Tailored)", profile.name);
    Some(tailored)
}

pub fn generate_cover_letter_ollama(
    profile: &CvProfile,
    company: &str,
    role: &str,
    job_description: &str,
    style: &str,
    config: &OllamaConfig,
) -> Option<String> {
    if !ollama_available(&config.url) {
        return None;
    }
    let prompt = format!(
        "Write a {style} cover letter for {role} at {company}. \
         Use this CV data and job description:\nCV: {}\nJob: {job_description}",
        serde_json::to_string(profile).ok()?
    );
    ollama_generate(&prompt, config, false)
}

pub fn extract_keywords(text: &str) -> Vec<String> {
    let re = regex::Regex::new(r"\b[A-Za-z][A-Za-z0-9+#.-]{2,}\b").unwrap();
    let stop_words = [
        "the", "and", "for", "with", "this", "that", "will", "have", "from", "your",
        "our", "are", "you", "all", "can", "able", "work", "team", "role", "job",
    ];
    let mut counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    for cap in re.find_iter(text) {
        let word = cap.as_str().to_lowercase();
        if word.len() > 3 && !stop_words.contains(&word.as_str()) {
            *counts.entry(word).or_insert(0) += 1;
        }
    }
    let mut keywords: Vec<(String, usize)> = counts.into_iter().collect();
    keywords.sort_by(|a, b| b.1.cmp(&a.1));
    keywords.into_iter().take(20).map(|(k, _)| k).collect()
}

#[derive(serde::Serialize)]
pub struct TailorResult {
    pub profile: CvProfile,
    pub used_ollama: bool,
}

pub fn tailor_cv(profile: &CvProfile, job_description: &str, config: &OllamaConfig) -> TailorResult {
    if let Some(tailored) = tailor_cv_with_ollama(profile, job_description, config) {
        TailorResult {
            profile: tailored,
            used_ollama: true,
        }
    } else {
        let keywords = extract_keywords(job_description);
        TailorResult {
            profile: tailor_cv_fallback(profile, &keywords),
            used_ollama: false,
        }
    }
}

pub fn generate_cover_letter(
    profile: &CvProfile,
    company: &str,
    role: &str,
    job_description: &str,
    style: &str,
    config: &OllamaConfig,
) -> (String, bool) {
    if let Some(letter) =
        generate_cover_letter_ollama(profile, company, role, job_description, style, config)
    {
        (letter, true)
    } else {
        (
            generate_cover_letter_fallback(profile, company, role, style),
            false,
        )
    }
}

pub fn parse_cv_with_ollama(raw_text: &str, config: &OllamaConfig) -> Option<CvProfile> {
    if !ollama_available(&config.url) {
        return None;
    }
    let prompt = format!(
        "Extract CV data from the following text. Return ONLY valid JSON matching CvProfile fields (personal, experience, education, skills, certifications, languages, professional_title).\nCV text:\n{raw_text}"
    );
    let raw = ollama_generate(&prompt, config, true)?;
    let mut profile: CvProfile = serde_json::from_str(&raw).ok()?;
    profile.id = String::new();
    profile.template = "modern-professional".into();
    profile.section_order = vec![
        "personal".into(),
        "experience".into(),
        "education".into(),
        "skills".into(),
        "certifications".into(),
        "courses".into(),
        "projects".into(),
        "languages".into(),
    ];
    Some(profile)
}

pub fn score_interview_answer(
    question: &str,
    answer: &str,
    config: &OllamaConfig,
) -> crate::db::models::InterviewAnswerScore {
    if answer.trim().len() < 20 {
        return crate::db::models::InterviewAnswerScore {
            score: 30.0,
            feedback: "Answer is too brief. Expand with a concrete example.".into(),
            star_completeness: "Missing Situation, Task, Action, and Result.".into(),
        };
    }
    if ollama_available(&config.url) {
        let prompt = format!(
            "Score this interview answer 0-100. Return ONLY JSON: {{\"score\":0,\"feedback\":\"\",\"star_completeness\":\"\"}}\nQuestion: {question}\nAnswer: {answer}"
        );
        if let Some(raw) = ollama_generate(&prompt, config, true) {
            if let Ok(score) = serde_json::from_str::<crate::db::models::InterviewAnswerScore>(&raw) {
                return score;
            }
        }
    }
    let has_numbers = answer.chars().any(|c| c.is_ascii_digit());
    let word_count = answer.split_whitespace().count();
    let score = (40.0 + word_count as f64 * 2.0 + if has_numbers { 15.0 } else { 0.0 }).min(85.0);
    crate::db::models::InterviewAnswerScore {
        score,
        feedback: "Good start. Add specific metrics and a clearer result statement.".into(),
        star_completeness: if word_count > 80 {
            "Partial STAR — strengthen the Result.".into()
        } else {
            "Expand with Situation and Task context.".into()
        },
    }
}

pub fn generate_interview_questions_ollama(
    cv: &CvProfile,
    job_text: &str,
    config: &OllamaConfig,
) -> Option<Vec<crate::db::models::InterviewQuestion>> {
    if !ollama_available(&config.url) {
        return None;
    }
    let prompt = format!(
        "Generate 6 interview questions for this role. Return ONLY JSON array: [{{\"question\":\"\",\"category\":\"behavioral|technical\",\"tip\":\"\"}}]\nCV: {}\nJob: {job_text}",
        serde_json::to_string(cv).ok()?
    );
    let raw = ollama_generate(&prompt, config, true)?;
    serde_json::from_str(&raw).ok()
}
