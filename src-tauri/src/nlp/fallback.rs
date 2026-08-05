use crate::db::models::CvProfile;

pub fn tailor_cv_fallback(profile: &CvProfile, keywords: &[String]) -> CvProfile {
    let mut tailored = profile.clone();
    tailored.name = format!("{} (Tailored)", profile.name);
    tailored.id = String::new();

    let missing: Vec<String> = keywords
        .iter()
        .filter(|k| !tailored.skills.iter().any(|s| s.eq_ignore_ascii_case(k)))
        .take(5)
        .cloned()
        .collect();
    if !missing.is_empty() {
        tailored.skills.extend(missing);
    }

    for exp in &mut tailored.experience {
        for bullet in &mut exp.bullets {
            if bullet.is_empty() {
                continue;
            }
            let lower = bullet.to_lowercase();
            for kw in keywords.iter().take(2) {
                if !lower.contains(&kw.to_lowercase()) && bullet.len() < 180 {
                    *bullet = format!("{bullet} using {kw}");
                    break;
                }
            }
        }
    }

    tailored
}

pub fn generate_cover_letter_fallback(
    profile: &CvProfile,
    company: &str,
    role: &str,
    style: &str,
) -> String {
    let greeting = match style {
        "friendly-professional" => format!("Hi {company} team,"),
        _ => format!("Dear {company} Hiring Manager,"),
    };

    format!(
        "{greeting}\n\n\
        I am writing to express my interest in the {role} position. \
        With experience spanning {}, I believe I would be a strong fit for your team.\n\n\
        {}\n\n\
        My background includes expertise in {}. \
        I am excited about the opportunity to contribute to {company} and would welcome the chance to discuss further.\n\n\
        Sincerely,\n{}\n",
        profile.experience.first().map(|e| e.title.as_str()).unwrap_or("my field"),
        profile.personal.summary,
        profile.skills.iter().take(5).cloned().collect::<Vec<_>>().join(", "),
        profile.personal.full_name,
    )
}
