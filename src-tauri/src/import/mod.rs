pub mod filename;
pub mod improvements;
pub mod pdf_extract;
pub mod pdf_parser;

use crate::db::models::ImportResult;
use crate::error::AppResult;
use crate::import::filename::parse_cv_filename;
use crate::import::pdf_extract::extract_pdf_text;
use crate::import::pdf_parser::parse_cv_text;
use crate::nlp::config::OllamaConfig;
use crate::nlp::rewrite::parse_cv_with_ollama;
use std::path::Path;

pub fn import_cv_from_pdf(path: &str, config: &OllamaConfig) -> AppResult<ImportResult> {
    let text = extract_pdf_text(path)?;
    let filename = Path::new(path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let mut result = parse_cv_text(&text, &filename);
    let scrambled = result.column_scramble_detected;

    let needs_ollama = scrambled
        || result.confidence < 80.0
        || result.profile.personal.full_name.is_empty()
        || result.profile.experience.is_empty();

    if needs_ollama {
        if let Some(ollama_profile) = parse_cv_with_ollama(&text, config) {
            if !ollama_profile.personal.full_name.is_empty() {
                result.warnings.push("Enhanced parsing via local Ollama".into());
                if scrambled {
                    merge_profiles_scramble(&mut result.profile, ollama_profile);
                } else {
                    merge_profiles(&mut result.profile, ollama_profile);
                }
                result.confidence = result.confidence.max(if scrambled { 75.0 } else { 75.0 });
            }
        }
    }

    if let Some(name_parts) = parse_cv_filename(&filename) {
        if result.profile.personal.full_name.is_empty() {
            result.profile.personal.full_name =
                format!("{} {}", name_parts.first, name_parts.last);
            result.warnings.push("Name inferred from filename".into());
        }
    }

    result.profile.source_filename = Some(filename);
    result.profile.name = result
        .profile
        .personal
        .full_name
        .clone()
        .trim()
        .to_string();
    if result.profile.name.is_empty() {
        result.profile.name = "Imported CV".into();
    }

    result.raw_text_preview = text.chars().take(2000).collect();
    Ok(result)
}

fn merge_profiles_scramble(base: &mut crate::db::models::CvProfile, incoming: crate::db::models::CvProfile) {
    let exp = incoming.experience.clone();
    let certs = incoming.certifications.clone();
    let skills = incoming.skills.clone();
    if !exp.is_empty() {
        base.experience = exp;
    }
    if !certs.is_empty() {
        base.certifications = certs;
    }
    if !skills.is_empty() {
        base.skills = skills;
    }
    merge_profiles(base, incoming);
}

fn merge_profiles(base: &mut crate::db::models::CvProfile, incoming: crate::db::models::CvProfile) {
    if base.personal.full_name.is_empty() {
        base.personal.full_name = incoming.personal.full_name;
    }
    if base.professional_title.is_empty() {
        base.professional_title = incoming.professional_title;
    }
    if base.personal.summary.is_empty() {
        base.personal.summary = incoming.personal.summary;
    }
    if base.personal.email.is_empty() {
        base.personal.email = incoming.personal.email;
    }
    if base.personal.phone.is_empty() {
        base.personal.phone = incoming.personal.phone;
    }
    if base.personal.location.is_empty() {
        base.personal.location = incoming.personal.location;
    }
    if base.experience.is_empty() {
        base.experience = incoming.experience;
    } else if incoming.experience.len() > base.experience.len() {
        base.experience = incoming.experience;
    }
    if base.education.is_empty() {
        base.education = incoming.education;
    }
    if base.skills.is_empty() {
        base.skills = incoming.skills;
    } else {
        for skill in incoming.skills {
            if !base.skills.iter().any(|s| s.eq_ignore_ascii_case(&skill)) {
                base.skills.push(skill);
            }
        }
    }
    if base.certifications.is_empty() {
        base.certifications = incoming.certifications;
    }
    if base.projects.is_empty() {
        base.projects = incoming.projects;
    }
    if base.languages.is_empty() {
        base.languages = incoming.languages;
    }
    if base.competence_notes.is_empty() {
        base.competence_notes = incoming.competence_notes;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::nlp::config::OllamaConfig;

    #[test]
    fn import_timothy_pdf_acceptance() {
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../CV_Timothy_Fasanya.pdf");
        if !std::path::Path::new(path).exists() {
            return;
        }
        let config = OllamaConfig {
            url: "http://127.0.0.1:11434".into(),
            model: "llama3.2".into(),
            temperature: 0.3,
            embed_model: "nomic-embed-text".into(),
        };
        let result = import_cv_from_pdf(path, &config).expect("import should succeed");
        assert!(result.column_scramble_detected);
        assert!(result.profile.personal.full_name.to_lowercase().contains("timothy"));
        assert!(result.profile.experience.len() >= 2);
        assert!(result.profile.skills.len() >= 15);
        assert!(result.profile.education.len() >= 3);
        for cert in &result.profile.certifications {
            assert!(!cert.name.to_lowercase().contains("network issues"));
        }
    }
}
