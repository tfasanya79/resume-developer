use crate::db::models::{CvProfile, TailorChange, TailorProposal};
use crate::nlp::config::{strip_json_fences, OllamaConfig};
use crate::nlp::fallback::tailor_cv_fallback;
use crate::nlp::rewrite::{extract_keywords, ollama_available};
use uuid::Uuid;

#[derive(serde::Deserialize)]
struct OllamaResponse {
    response: String,
}

pub fn propose_tailor(
    profile: &CvProfile,
    job_description: &str,
    config: &OllamaConfig,
) -> TailorProposal {
    let (company, role) = crate::semantic::ats::extract_job_metadata(job_description);
    let keywords = extract_keywords(job_description);

    let tailored = if ollama_available(&config.url) {
        if let Some(t) = tailor_with_ollama(profile, job_description, config) {
            t
        } else {
            tailor_cv_fallback(profile, &keywords)
        }
    } else {
        tailor_cv_fallback(profile, &keywords)
    };

    let used_ollama = ollama_available(&config.url);
    let changes = diff_profiles(profile, &tailored, &keywords);

    TailorProposal {
        changes,
        used_ollama,
        company,
        role,
    }
}

fn tailor_with_ollama(
    profile: &CvProfile,
    job_description: &str,
    config: &OllamaConfig,
) -> Option<CvProfile> {
    let prompt = format!(
        "Rewrite experience bullets to match the job. Return ONLY JSON for experience array:
        [{{\"id\":\"\",\"bullets\":[]}}]
        Job: {job_description}
        CV experience: {}",
        serde_json::to_string(&profile.experience).ok()?
    );
    let client = reqwest::blocking::Client::new();
    let body = serde_json::json!({
        "model": config.model,
        "prompt": prompt,
        "stream": false,
        "format": "json",
        "options": { "temperature": config.temperature }
    });
    let response = client
        .post(format!("{}/api/generate", config.url))
        .json(&body)
        .send()
        .ok()?;
    let ollama: OllamaResponse = response.json().ok()?;
    let cleaned = strip_json_fences(&ollama.response);
    let mut tailored = profile.clone();
    if let Ok(updated) = serde_json::from_str::<Vec<crate::db::models::ExperienceItem>>(&cleaned) {
        for upd in updated {
            if let Some(exp) = tailored.experience.iter_mut().find(|e| e.id == upd.id) {
                if !upd.bullets.is_empty() {
                    exp.bullets = upd.bullets;
                }
            }
        }
    } else {
        return None;
    }
    tailored.id = String::new();
    tailored.name = format!("{} (Tailored)", profile.name);
    tailored.parent_cv_id = Some(profile.id.clone());
    Some(tailored)
}

pub fn apply_proposal(profile: &CvProfile, proposal: &TailorProposal) -> CvProfile {
    let mut result = profile.clone();
    result.id = String::new();
    result.name = format!("{} (Tailored)", profile.name);
    result.parent_cv_id = Some(profile.id.clone());

    for change in &proposal.changes {
        apply_change(&mut result, change);
    }
    result
}

fn apply_change(profile: &mut CvProfile, change: &TailorChange) {
    if change.path.starts_with("experience.") {
        let parts: Vec<&str> = change.path.split('.').collect();
        if parts.len() >= 3 {
            let exp_id = parts[1];
            if let Some(bullet_part) = parts.get(2) {
                if let Some(bi_str) = bullet_part.strip_prefix("bullet") {
                    if let Ok(bi) = bi_str.parse::<usize>() {
                        if let Some(exp) = profile.experience.iter_mut().find(|e| e.id == exp_id) {
                            if bi < exp.bullets.len() {
                                exp.bullets[bi] = change.after.clone();
                            }
                        }
                    }
                }
            }
        }
    } else if change.path == "skills" {
        let skills: Vec<String> = change
            .after
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        profile.skills = skills;
    } else if change.path == "personal.summary" {
        profile.personal.summary = change.after.clone();
    }
}

fn diff_profiles(original: &CvProfile, tailored: &CvProfile, keywords: &[String]) -> Vec<TailorChange> {
    let mut changes = Vec::new();

    for (oi, oexp) in original.experience.iter().enumerate() {
        if let Some(texp) = tailored.experience.get(oi) {
            for (bi, (ob, tb)) in oexp.bullets.iter().zip(texp.bullets.iter()).enumerate() {
                if ob != tb && !tb.is_empty() {
                    changes.push(TailorChange {
                        id: Uuid::new_v4().to_string(),
                        path: format!("experience.{}.bullet{}", oexp.id, bi),
                        before: ob.clone(),
                        after: tb.clone(),
                        reason: "Tailored bullet for job match".into(),
                    });
                }
            }
        }
    }

    if original.skills != tailored.skills {
        changes.push(TailorChange {
            id: Uuid::new_v4().to_string(),
            path: "skills".into(),
            before: original.skills.join(", "),
            after: tailored.skills.join(", "),
            reason: "Added missing job keywords to skills".into(),
        });
    }

    if changes.is_empty() && !keywords.is_empty() {
        let missing: Vec<String> = keywords
            .iter()
            .filter(|k| !original.skills.iter().any(|s| s.eq_ignore_ascii_case(k)))
            .take(3)
            .cloned()
            .collect();
        if !missing.is_empty() {
            let mut skills = original.skills.clone();
            skills.extend(missing.clone());
            changes.push(TailorChange {
                id: Uuid::new_v4().to_string(),
                path: "skills".into(),
                before: original.skills.join(", "),
                after: skills.join(", "),
                reason: format!("Highlight keywords: {}", missing.join(", ")),
            });
        }
    }

    changes
}
