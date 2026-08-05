use crate::db::models::{
    CertificationItem, CvProfile, EducationItem, ExperienceItem, ImportResult, LanguageItem,
    ProjectItem,
};
use regex::Regex;
use uuid::Uuid;

const SECTION_HEADERS: &[&str] = &[
    "PROFILE",
    "EDUCATION",
    "EMPLOYMENT HISTORY",
    "DETAILS",
    "LANGUAGES",
    "KEY SKILLS",
    "CERTIFICATIONS",
    "PROJECTS AND ACHIEVEMENTS",
    "IT COMPETENCE",
];

const SECTION_ALIASES: &[(&str, &str)] = &[
    ("WORK EXPERIENCE", "EMPLOYMENT HISTORY"),
    ("PROFESSIONAL EXPERIENCE", "EMPLOYMENT HISTORY"),
    ("EXPERIENCE", "EMPLOYMENT HISTORY"),
    ("WORK HISTORY", "EMPLOYMENT HISTORY"),
    ("SKILLS", "KEY SKILLS"),
    ("TECHNICAL SKILLS", "KEY SKILLS"),
    ("CORE COMPETENCIES", "KEY SKILLS"),
    ("SUMMARY", "PROFILE"),
    ("PROFESSIONAL SUMMARY", "PROFILE"),
    ("ABOUT ME", "PROFILE"),
    ("PROJECTS", "PROJECTS AND ACHIEVEMENTS"),
    ("ACHIEVEMENTS", "PROJECTS AND ACHIEVEMENTS"),
];

pub fn detect_column_scramble(sections: &std::collections::HashMap<String, String>) -> bool {
    let Some(certs_body) = sections.get("CERTIFICATIONS") else {
        return false;
    };
    let job_re = Regex::new(
        r"(?i)(consultant|manager|technician|partner|engineer|director|lead|specialist)\s*\|",
    )
    .unwrap();
    if job_re.is_match(certs_body) {
        return true;
    }
    for line in certs_body.lines().map(|l| l.trim()).filter(|l| !l.is_empty()) {
        if line.starts_with('•') || line.starts_with('-') {
            return true;
        }
        if line.ends_with('.')
            && line.chars().next().map(|c| c.is_lowercase()).unwrap_or(false)
            && !line.contains('|')
        {
            return true;
        }
        if line.contains('|') && is_job_header_line(line) {
            return true;
        }
    }
    false
}

fn resolve_header(line: &str) -> Option<String> {
    let upper = line.trim().to_uppercase();
    if SECTION_HEADERS.iter().any(|h| upper == *h) {
        return Some(upper);
    }
    for (alias, canonical) in SECTION_ALIASES {
        if upper == *alias {
            return Some(canonical.to_string());
        }
    }
    None
}

pub fn parse_cv_text(text: &str, filename: &str) -> ImportResult {
    let normalized = normalize_text(text);
    let lines: Vec<String> = normalized
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();

    let (header_lines, sections) = split_sections(&lines);
    let scrambled = detect_column_scramble(&sections);
    let mut profile = CvProfile::default();
    let mut warnings = Vec::new();

    parse_header(&header_lines, &mut profile, &mut warnings);
    parse_profile_section(sections.get("PROFILE"), &mut profile);
    parse_education_section(sections.get("EDUCATION"), &mut profile);
    parse_experience_section(sections.get("EMPLOYMENT HISTORY"), &mut profile);
    parse_skills_section(sections.get("KEY SKILLS"), &mut profile);
    parse_certifications_section(sections.get("CERTIFICATIONS"), &mut profile);
    parse_projects_section(sections.get("PROJECTS AND ACHIEVEMENTS"), &mut profile);
    parse_languages_section(sections.get("LANGUAGES"), &mut profile);
    parse_competence_section(sections.get("IT COMPETENCE"), &mut profile);

    if scrambled {
        warnings.push(
            "Multi-column PDF detected — please review experience and certifications".into(),
        );
        profile.experience = parse_experience_from_full_text(&lines);
        profile.certifications = parse_certifications_sanitized(sections.get("CERTIFICATIONS"));
        let competence_certs = parse_competence_certs_only(sections.get("IT COMPETENCE"));
        for cert in competence_certs {
            if !profile
                .certifications
                .iter()
                .any(|c| c.name.eq_ignore_ascii_case(&cert.name))
            {
                profile.certifications.push(cert);
            }
        }
        profile.competence_notes = parse_competence_notes_only(sections.get("IT COMPETENCE"));
    }

    if profile.personal.full_name.is_empty() {
        warnings.push("Could not detect full name from PDF".into());
    }
    if profile.experience.is_empty() {
        warnings.push("No employment history detected — please review".into());
    }

    let confidence = compute_confidence(&profile, &warnings);
    let unparsed: Vec<String> = sections
        .get("DETAILS")
        .map(|s| vec![s.clone()])
        .unwrap_or_default();

    profile.source_filename = Some(filename.to_string());
    profile.name = if profile.personal.full_name.is_empty() {
        "Imported CV".into()
    } else {
        profile.personal.full_name.clone()
    };

    ImportResult {
        profile,
        warnings,
        confidence,
        unparsed_fragments: unparsed,
        raw_text_preview: String::new(),
        column_scramble_detected: scrambled,
    }
}

fn normalize_text(text: &str) -> String {
    let re_page = Regex::new(r"--\s*\d+\s+of\s+\d+\s*--").unwrap();
    re_page
        .replace_all(text, "\n")
        .replace('\r', "")
        .replace("  ", " ")
}

fn split_sections(lines: &[String]) -> (Vec<String>, std::collections::HashMap<String, String>) {
    let mut header_lines = Vec::new();
    let mut sections: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    let mut current_header: Option<String> = None;
    let mut current_body: Vec<String> = Vec::new();
    let mut found_first_section = false;

    for line in lines {
        if let Some(header) = resolve_header(line) {
            if let Some(h) = current_header.take() {
                sections.insert(h, current_body.join("\n"));
                current_body.clear();
            }
            found_first_section = true;
            current_header = Some(header);
            continue;
        }
        if found_first_section {
            if let Some(_) = current_header {
                current_body.push(line.clone());
            }
        } else {
            header_lines.push(line.clone());
        }
    }
    if let Some(h) = current_header {
        sections.insert(h, current_body.join("\n"));
    }
    (header_lines, sections)
}

fn parse_header(lines: &[String], profile: &mut CvProfile, warnings: &mut Vec<String>) {
    if lines.is_empty() {
        return;
    }
    profile.personal.full_name = title_case(lines[0].as_str());
    if lines.len() > 1 && lines[1].contains('|') {
        profile.professional_title = lines[1].clone();
    }
    let contact_line = lines.iter().find(|l| l.contains('@') || l.contains('+'));
    if let Some(contact) = contact_line {
        extract_contact(contact, profile);
    } else if lines.len() > 2 {
        extract_contact(&lines[2], profile);
    } else {
        warnings.push("Contact details may be incomplete".into());
    }
}

fn extract_contact(line: &str, profile: &mut CvProfile) {
    let email_re = Regex::new(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}").unwrap();
    let phone_re = Regex::new(r"\+\d[\d\s\-]{7,}").unwrap();
    let url_re = Regex::new(r"(linkedin\.com/\S+|credly\.com/\S+|https?://\S+)").unwrap();

    if let Some(m) = email_re.find(line) {
        profile.personal.email = m.as_str().to_string();
    }
    if let Some(m) = phone_re.find(line) {
        profile.personal.phone = m.as_str().trim().to_string();
    }
    for m in url_re.find_iter(line) {
        let url = m.as_str();
        if url.contains("linkedin") {
            profile.personal.linkedin = url.to_string();
        } else if !profile.personal.website.is_empty() {
            profile.personal.website = url.to_string();
        } else {
            profile.personal.website = url.to_string();
        }
    }
    let parts: Vec<&str> = line.split('|').map(|p| p.trim()).collect();
    if let Some(first) = parts.first() {
        if !first.contains('@') && !first.contains('+') && !first.contains("linkedin") {
            profile.personal.location = first.to_string();
        }
    }
}

fn parse_profile_section(body: Option<&String>, profile: &mut CvProfile) {
    if let Some(text) = body {
        profile.personal.summary = text.trim().to_string();
    }
}

fn parse_education_section(body: Option<&String>, profile: &mut CvProfile) {
    let Some(text) = body else { return };
    let blocks: Vec<&str> = text.split('\n').collect();
    let mut i = 0;
    while i < blocks.len() {
        let line = blocks[i].trim();
        if line.is_empty() {
            i += 1;
            continue;
        }
        if line.to_uppercase().contains("UNIVERSITY")
            || line.contains('|')
            || line.contains("Polytechnic")
            || line.contains("College")
        {
            let degree = if i > 0 && !blocks[i - 1].trim().is_empty() && !blocks[i - 1].contains('|') {
                blocks[i - 1].trim().to_string()
            } else {
                line.split('|').next().unwrap_or(line).trim().to_string()
            };
            let institution_line = if line.contains('|') { line } else { line };
            let parts: Vec<&str> = institution_line.split('|').collect();
            let institution = parts[0].trim().to_string();
            let dates = parts.get(1).unwrap_or(&"").trim().to_string();
            let (start, end) = split_dates(&dates);
            let mut details = String::new();
            if i + 1 < blocks.len() && blocks[i + 1].starts_with("Focus:") {
                details = blocks[i + 1].trim().to_string();
                i += 1;
            }
            profile.education.push(EducationItem {
                id: Uuid::new_v4().to_string(),
                institution,
                degree,
                field: String::new(),
                start_date: start,
                end_date: end,
                details,
            });
        }
        i += 1;
    }
}

fn parse_experience_section(body: Option<&String>, profile: &mut CvProfile) {
    let Some(text) = body else { return };
    let lines: Vec<&str> = text.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
    let mut i = 0;
    while i < lines.len() {
        let line = lines[i];
        if line.contains('|') && !line.starts_with('•') {
            let parts: Vec<&str> = line.split('|').map(|p| p.trim()).collect();
            if parts.len() >= 2 {
                push_experience(profile, parts[0], parts[1], &lines, &mut i);
                continue;
            }
        }
        if line.contains(" at ") && !line.starts_with('•') {
            let parts: Vec<&str> = line.splitn(2, " at ").collect();
            if parts.len() == 2 {
                push_experience(profile, parts[0].trim(), parts[1].trim(), &lines, &mut i);
                continue;
            }
        }
        if line.contains(" — ") && !line.starts_with('•') {
            let parts: Vec<&str> = line.splitn(2, " — ").collect();
            if parts.len() == 2 {
                push_experience(profile, parts[0].trim(), parts[1].trim(), &lines, &mut i);
                continue;
            }
        }
        i += 1;
    }
}

fn push_experience(
    profile: &mut CvProfile,
    title: &str,
    company: &str,
    lines: &[&str],
    i: &mut usize,
) {
    push_experience_inner(profile, title, company, lines, i, false);
}

fn push_experience_inner(
    profile: &mut CvProfile,
    title: &str,
    company: &str,
    lines: &[&str],
    i: &mut usize,
    ignore_section_breaks: bool,
) {
    *i += 1;
    let date_line = if *i < lines.len() { lines[*i] } else { "" };
    let (start, end, current) = parse_date_range(date_line);
    if !date_line.is_empty() && looks_like_date_line(date_line) {
        *i += 1;
    }
    let mut bullets = Vec::new();
    while *i < lines.len() {
        let line = lines[*i];
        if is_job_header_line(line) {
            break;
        }
        if !ignore_section_breaks && resolve_header(line).is_some() {
            break;
        }
        if line.starts_with('•') || line.starts_with('-') {
            bullets.push(
                line.trim_start_matches('•')
                    .trim_start_matches('-')
                    .trim()
                    .to_string(),
            );
            *i += 1;
        } else if !bullets.is_empty() && is_bullet_continuation(line) {
            if let Some(last) = bullets.last_mut() {
                if !last.is_empty() {
                    last.push(' ');
                }
                last.push_str(line);
            }
            *i += 1;
        } else if ignore_section_breaks
            && !bullets.is_empty()
            && line.ends_with('.')
            && line.chars().next().map(|c| c.is_lowercase()).unwrap_or(false)
        {
            if let Some(last) = bullets.last_mut() {
                if !last.is_empty() {
                    last.push(' ');
                }
                last.push_str(line);
            }
            *i += 1;
        } else if !ignore_section_breaks {
            break;
        } else {
            *i += 1;
        }
    }
    profile.experience.push(ExperienceItem {
        id: Uuid::new_v4().to_string(),
        company: company.to_string(),
        title: title.to_string(),
        location: String::new(),
        start_date: start,
        end_date: end,
        current,
        bullets,
    });
}

fn is_bullet_continuation(line: &str) -> bool {
    let t = line.trim();
    !t.is_empty()
        && !t.starts_with('•')
        && !t.starts_with('-')
        && !is_job_header_line(t)
        && resolve_header(t).is_none()
        && !looks_like_date_line(t)
}

fn looks_like_date_line(line: &str) -> bool {
    let lower = line.to_lowercase();
    lower.contains("present")
        || lower.contains("january")
        || lower.contains("february")
        || lower.contains("march")
        || lower.contains("april")
        || lower.contains("may")
        || lower.contains("june")
        || lower.contains("july")
        || lower.contains("august")
        || lower.contains("september")
        || lower.contains("october")
        || lower.contains("november")
        || lower.contains("december")
        || Regex::new(r"\d{4}\s*--").unwrap().is_match(line)
}

fn is_job_header_line(line: &str) -> bool {
    if !line.contains('|') || line.starts_with('•') || line.starts_with('-') {
        return false;
    }
    let parts: Vec<&str> = line.split('|').map(|p| p.trim()).collect();
    if parts.len() < 2 {
        return false;
    }
    let left = parts[0];
    let right = parts[1..].join(" | ");
    if is_year_only(&right) && !looks_like_job_title(left) {
        return false;
    }
    looks_like_job_title(left) || left.len() > 25
}

fn is_year_only(s: &str) -> bool {
    let t = s.trim();
    t.len() <= 8 && t.chars().all(|c| c.is_ascii_digit() || c.is_whitespace())
}

fn looks_like_job_title(title: &str) -> bool {
    let lower = title.to_lowercase();
    [
        "consultant",
        "manager",
        "technician",
        "partner",
        "engineer",
        "developer",
        "analyst",
        "director",
        "lead",
        "specialist",
        "coordinator",
        "administrator",
    ]
    .iter()
    .any(|w| lower.contains(w))
}

fn is_valid_cert_name(name: &str) -> bool {
    let t = name.trim();
    !t.is_empty()
        && t.len() < 80
        && !t.starts_with('•')
        && !t.contains("Contributed")
        && !t.contains("Managed delivery")
        && !is_job_header_line(t)
        && !(t.chars().next().map(|c| c.is_lowercase()).unwrap_or(false)
            && t.ends_with('.'))
}

fn parse_experience_from_full_text(lines: &[String]) -> Vec<ExperienceItem> {
    let refs: Vec<&str> = lines.iter().map(|s| s.as_str()).collect();
    let mut profile = CvProfile::default();
    let mut i = 0;
    while i < refs.len() {
        let line = refs[i];
        if is_job_header_line(line) {
            let parts: Vec<&str> = line.split('|').map(|p| p.trim()).collect();
            if parts.len() >= 2 {
                push_experience_inner(
                    &mut profile,
                    parts[0],
                    parts[1..].join(" | ").as_str(),
                    &refs,
                    &mut i,
                    true,
                );
                continue;
            }
        }
        i += 1;
    }
    profile.experience
}

fn parse_certifications_sanitized(body: Option<&String>) -> Vec<CertificationItem> {
    let Some(text) = body else { return Vec::new() };
    let lines: Vec<&str> = text.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
    let mut certs = Vec::new();
    let mut i = 0;
    while i < lines.len() {
        if is_job_header_line(lines[i]) || lines[i].starts_with('•') || lines[i].starts_with('-') {
            i += 1;
            continue;
        }
        let name = lines[i].to_string();
        i += 1;
        if i < lines.len() && lines[i].contains('|') && !is_job_header_line(lines[i]) {
            let parts: Vec<&str> = lines[i].split('|').collect();
            let issuer = parts[0].trim();
            let year = parts.get(1).unwrap_or(&"").trim();
            if is_valid_cert_name(&name) && is_year_only(year) {
                certs.push(CertificationItem {
                    id: Uuid::new_v4().to_string(),
                    name,
                    issuer: issuer.to_string(),
                    year: year.to_string(),
                });
            }
            i += 1;
        }
    }
    certs
}

fn parse_competence_certs_only(body: Option<&String>) -> Vec<CertificationItem> {
    let Some(text) = body else { return Vec::new() };
    let lines: Vec<&str> = text.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
    let mut certs = Vec::new();
    let mut i = 0;
    while i < lines.len() {
        let name = lines[i];
        if name.contains(':') && name.len() > 80 {
            i += 1;
            continue;
        }
        if i + 1 < lines.len() && lines[i + 1].contains('|') {
            let parts: Vec<&str> = lines[i + 1].split('|').collect();
            let year_part = parts.get(1).unwrap_or(&"").trim();
            if is_valid_cert_name(name) && (is_year_only(year_part) || year_part.len() <= 12) {
                certs.push(CertificationItem {
                    id: Uuid::new_v4().to_string(),
                    name: name.to_string(),
                    issuer: parts[0].trim().to_string(),
                    year: year_part.to_string(),
                });
                i += 2;
                continue;
            }
        }
        i += 1;
    }
    certs
}

fn parse_competence_notes_only(body: Option<&String>) -> Vec<String> {
    let Some(text) = body else { return Vec::new() };
    let mut notes = Vec::new();
    for para in text.split("\n\n") {
        let p = para.trim();
        if p.len() > 80 && p.contains(':') && !p.contains('|') {
            notes.push(p.to_string());
        }
    }
    notes
}

fn parse_skills_section(body: Option<&String>, profile: &mut CvProfile) {
    let Some(text) = body else { return };
    for line in text.lines() {
        let skill = line
            .trim()
            .trim_start_matches('•')
            .trim_start_matches('-')
            .trim();
        if !skill.is_empty() && skill.len() < 80 {
            profile.skills.push(skill.to_string());
        }
    }
}

fn parse_certifications_section(body: Option<&String>, profile: &mut CvProfile) {
    let Some(text) = body else { return };
    let lines: Vec<&str> = text.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
    let mut i = 0;
    while i < lines.len() {
        let name = lines[i].to_string();
        i += 1;
        if i < lines.len() && lines[i].contains('|') {
            let parts: Vec<&str> = lines[i].split('|').collect();
            profile.certifications.push(CertificationItem {
                id: Uuid::new_v4().to_string(),
                name,
                issuer: parts[0].trim().to_string(),
                year: parts.get(1).unwrap_or(&"").trim().to_string(),
            });
            i += 1;
        }
    }
}

fn parse_projects_section(body: Option<&String>, profile: &mut CvProfile) {
    let Some(text) = body else { return };
    let lines: Vec<&str> = text.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
    let mut i = 0;
    while i < lines.len() {
        let name = lines[i].to_string();
        i += 1;
        let mut desc = String::new();
        while i < lines.len()
            && !lines[i].chars().next().map(|c| c.is_uppercase()).unwrap_or(false)
        {
            if !desc.is_empty() {
                desc.push(' ');
            }
            desc.push_str(lines[i]);
            i += 1;
        }
        profile.projects.push(ProjectItem {
            id: Uuid::new_v4().to_string(),
            name,
            description: desc,
            technologies: Vec::new(),
            url: String::new(),
        });
    }
}

fn parse_languages_section(body: Option<&String>, profile: &mut CvProfile) {
    let Some(text) = body else { return };
    for line in text.lines() {
        let line = line.trim().trim_start_matches('•');
        if let Some((lang, level)) = line.split_once('(') {
            profile.languages.push(LanguageItem {
                id: Uuid::new_v4().to_string(),
                language: lang.trim().to_string(),
                level: level.trim_end_matches(')').trim().to_string(),
            });
        } else if !line.is_empty() {
            profile.languages.push(LanguageItem {
                id: Uuid::new_v4().to_string(),
                language: line.to_string(),
                level: String::new(),
            });
        }
    }
}

fn parse_competence_section(body: Option<&String>, profile: &mut CvProfile) {
    let Some(text) = body else { return };
    let cert_re = Regex::new(r"^([A-Za-z0-9\s\(\)\.+]+)\n([^\n]+\|\s*\d{4})").unwrap();
    for cap in cert_re.captures_iter(text) {
        if let (Some(name), Some(rest)) = (cap.get(1), cap.get(2)) {
            let parts: Vec<&str> = rest.as_str().split('|').collect();
            profile.certifications.push(CertificationItem {
                id: Uuid::new_v4().to_string(),
                name: name.as_str().trim().to_string(),
                issuer: parts[0].trim().to_string(),
                year: parts.get(1).unwrap_or(&"").trim().to_string(),
            });
        }
    }
    for block in text.split('\n').collect::<Vec<_>>().windows(2) {
        if block[1].contains('|') && block[1].chars().any(|c| c.is_ascii_digit()) {
            let parts: Vec<&str> = block[1].split('|').collect();
            let name = block[0].trim();
            if !name.is_empty()
                && !profile.certifications.iter().any(|c| c.name == name)
            {
                profile.certifications.push(CertificationItem {
                    id: Uuid::new_v4().to_string(),
                    name: name.to_string(),
                    issuer: parts[0].trim().to_string(),
                    year: parts.get(1).unwrap_or(&"").trim().to_string(),
                });
            }
        }
    }
    for para in text.split("\n\n") {
        let p = para.trim();
        if p.len() > 80 && p.contains(':') && !p.contains('|') {
            profile.competence_notes.push(p.to_string());
        }
    }
}

fn split_dates(dates: &str) -> (String, String) {
    let parts: Vec<&str> = dates.split("--").map(|s| s.trim()).collect();
    if parts.len() >= 2 {
        (parts[0].to_string(), parts[1].to_string())
    } else {
        (dates.to_string(), String::new())
    }
}

fn parse_date_range(line: &str) -> (String, String, bool) {
    let current = line.to_lowercase().contains("present");
    let cleaned = line.replace("--", "-");
    let parts: Vec<&str> = cleaned.split('-').map(|s| s.trim()).collect();
    if parts.len() >= 2 {
        (
            parts[0].to_string(),
            parts[1].to_string(),
            current,
        )
    } else {
        (line.to_string(), String::new(), current)
    }
}

fn compute_confidence(profile: &CvProfile, warnings: &Vec<String>) -> f64 {
    let mut score = 100.0_f64;
    if profile.personal.full_name.is_empty() {
        score -= 25.0;
    }
    if profile.personal.email.is_empty() {
        score -= 10.0;
    }
    if profile.experience.is_empty() {
        score -= 20.0;
    }
    if profile.personal.summary.is_empty() {
        score -= 10.0;
    }
    score -= (warnings.len() as f64) * 3.0;
    score.clamp(0.0, 100.0)
}

fn title_case(s: &str) -> String {
    s.split_whitespace()
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str().to_lowercase().as_str(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_timothy_cv_fixture() {
        let fixture = include_str!("../../tests/fixtures/cv_timothy_fasanya.txt");
        let result = parse_cv_text(fixture, "CV_Timothy_Fasanya.pdf");
        assert!(result.confidence >= 50.0);
        assert!(result.profile.personal.full_name.to_lowercase().contains("timothy"));
        assert!(!result.profile.personal.summary.is_empty());
        assert!(!result.profile.experience.is_empty());
        assert!(!result.profile.skills.is_empty());
    }

    #[test]
    fn parses_jane_doe_fixture() {
        let fixture = include_str!("../../tests/fixtures/cv_jane_doe.txt");
        let result = parse_cv_text(fixture, "CV_Jane_Doe.pdf");
        assert!(result.profile.personal.full_name.to_lowercase().contains("jane"));
        assert!(!result.profile.experience.is_empty());
    }

    #[test]
    fn parses_work_experience_alias() {
        let fixture = include_str!("../../tests/fixtures/cv_work_experience_alias.txt");
        let result = parse_cv_text(fixture, "CV_John_Smith.pdf");
        assert!(!result.profile.experience.is_empty());
        assert!(result.profile.experience[0].company.to_lowercase().contains("global"));
    }

    #[test]
    fn parses_timothy_raw_detects_scramble() {
        let fixture = include_str!("../../tests/fixtures/cv_timothy_fasanya_raw.txt");
        let result = parse_cv_text(fixture, "CV_Timothy_Fasanya.pdf");
        assert!(result.column_scramble_detected);
        assert!(result.profile.personal.full_name.to_lowercase().contains("timothy"));
        assert!(!result.profile.personal.email.is_empty());
        assert!(!result.profile.personal.phone.is_empty());
        assert!(result.profile.experience.len() >= 2);

        let has_full_network_bullet = result.profile.experience.iter().any(|exp| {
            exp.bullets.iter().any(|b| {
                b.to_lowercase().contains("network issues")
                    || b.to_lowercase().contains("network migration")
            })
        });
        assert!(
            has_full_network_bullet,
            "Expected complete employment bullets including network migration content"
        );

        for cert in &result.profile.certifications {
            assert!(
                !cert.name.to_lowercase().contains("network issues"),
                "Cert name should not contain employment bleed: {}",
                cert.name
            );
            assert!(
                !cert.name.contains("Consultant"),
                "Cert name should not be a job title: {}",
                cert.name
            );
        }

        assert!(result.profile.skills.len() >= 15);
    }
}
