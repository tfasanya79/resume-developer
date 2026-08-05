use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ParsedName {
    pub first: String,
    pub last: String,
}

pub fn format_cv_filename(full_name: &str) -> String {
    let parts: Vec<String> = full_name
        .split_whitespace()
        .filter(|p| !p.is_empty())
        .map(|p| {
            let mut c = p.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str().to_lowercase().as_str(),
            }
        })
        .collect();
    if parts.is_empty() {
        return "CV_Resume.pdf".into();
    }
    format!("CV_{}.pdf", parts.join("_"))
}

pub fn parse_cv_filename(filename: &str) -> Option<ParsedName> {
    let stem = filename
        .trim()
        .strip_suffix(".pdf")
        .or_else(|| filename.strip_suffix(".PDF"))?;
    let stem = stem.strip_prefix("CV_").or_else(|| stem.strip_prefix("cv_"))?;
    let parts: Vec<&str> = stem.split('_').filter(|p| !p.is_empty()).collect();
    if parts.len() >= 2 {
        Some(ParsedName {
            first: capitalize(parts[0]),
            last: capitalize(parts[1]),
        })
    } else {
        None
    }
}

fn capitalize(s: &str) -> String {
    let mut c = s.chars();
    match c.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().collect::<String>() + c.as_str().to_lowercase().as_str(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_cv_filename() {
        assert_eq!(
            format_cv_filename("Timothy Fasanya"),
            "CV_Timothy_Fasanya.pdf"
        );
    }

    #[test]
    fn parses_cv_filename() {
        let parsed = parse_cv_filename("CV_Timothy_Fasanya.pdf").unwrap();
        assert_eq!(parsed.first, "Timothy");
        assert_eq!(parsed.last, "Fasanya");
    }
}
