use crate::db::models::CvProfile;
use crate::error::{AppError, AppResult};
use printpdf::*;
use std::fs::File;
use std::io::BufWriter;

const PAGE_BOTTOM: f32 = 25.0;
const MARGIN_X: f32 = 20.0;
const BULLET_INDENT: f32 = 24.0;

struct PdfWriter<'a> {
    doc: PdfDocumentReference,
    page: PdfPageIndex,
    layer: PdfLayerIndex,
    font_bold: IndirectFontRef,
    font_regular: IndirectFontRef,
    y: f32,
    _phantom: std::marker::PhantomData<&'a ()>,
}

impl PdfWriter<'_> {
    fn new(doc: PdfDocumentReference, page: PdfPageIndex, layer: PdfLayerIndex, bold: IndirectFontRef, regular: IndirectFontRef) -> Self {
        Self {
            doc,
            page,
            layer,
            font_bold: bold,
            font_regular: regular,
            y: 280.0,
            _phantom: std::marker::PhantomData,
        }
    }

    fn layer(&self) -> PdfLayerReference {
        self.doc.get_page(self.page).get_layer(self.layer)
    }

    fn ensure_space(&mut self, needed: f32) {
        if self.y - needed >= PAGE_BOTTOM {
            return;
        }
        let (page, layer) = self.doc.add_page(Mm(210.0), Mm(297.0), "Layer");
        self.page = page;
        self.layer = layer;
        self.y = 280.0;
    }

    fn write_line(&mut self, text: &str, size: f32, x: f32, bold: bool) {
        if text.is_empty() {
            return;
        }
        self.ensure_space(6.0);
        let font = if bold { &self.font_bold } else { &self.font_regular };
        self.layer().use_text(sanitize_pdf_text(text), size, Mm(x), Mm(self.y), font);
        self.y -= size * 0.45 + 1.5;
    }

    fn write_wrapped(&mut self, text: &str, size: f32, x: f32, max_chars: usize) {
        for line in wrap_text(text, max_chars) {
            self.write_line(&line, size, x, false);
        }
    }

    fn section_heading(&mut self, title: &str) {
        self.y -= 4.0;
        self.write_line(title, 12.0, MARGIN_X, true);
        self.y -= 2.0;
    }
}

pub fn export_cv_pdf(profile: &CvProfile, path: &str) -> AppResult<()> {
    let (doc, page1, layer1) =
        PdfDocument::new(&profile.name, Mm(210.0), Mm(297.0), "Layer 1");
    let font_bold = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| AppError::Pdf(e.to_string()))?;
    let font_regular = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let mut w = PdfWriter::new(doc, page1, layer1, font_bold, font_regular);

    w.write_line(&profile.personal.full_name, 24.0, MARGIN_X, true);
    if !profile.professional_title.is_empty() {
        w.write_line(&profile.professional_title, 11.0, MARGIN_X, false);
    }

    let mut contact_parts: Vec<String> = vec![
        profile.personal.email.clone(),
        profile.personal.phone.clone(),
        profile.personal.location.clone(),
    ];
    if !profile.personal.links.is_empty() {
        for link in &profile.personal.links {
            if link.url.trim().is_empty() {
                continue;
            }
            let shortened = shorten_url(&link.url);
            let part = if link.label.trim().is_empty() {
                shortened
            } else {
                format!("{}: {}", link.label.trim(), shortened)
            };
            contact_parts.push(part);
        }
    } else {
        if !profile.personal.linkedin.is_empty() {
            contact_parts.push(format!("LinkedIn: {}", shorten_url(&profile.personal.linkedin)));
        }
        if !profile.personal.website.is_empty() {
            let label = if profile.personal.website.to_lowercase().contains("credly.com") {
                "Credly"
            } else {
                "Website"
            };
            contact_parts.push(format!("{}: {}", label, shorten_url(&profile.personal.website)));
        }
    }
    let contact = contact_parts
        .into_iter()
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join(" | ");
    w.write_wrapped(&contact, 10.0, MARGIN_X, 85);

    if !profile.personal.summary.is_empty() {
        w.section_heading("SUMMARY");
        w.write_wrapped(&profile.personal.summary, 10.0, MARGIN_X, 85);
    }

    for section in &profile.section_order {
        match section.as_str() {
            "experience" => write_experience(&mut w, profile),
            "education" => write_education(&mut w, profile),
            "skills" => write_skills(&mut w, profile),
            "certifications" => write_certifications(&mut w, profile),
            "courses" => write_courses(&mut w, profile),
            "languages" => write_languages(&mut w, profile),
            "projects" => write_projects(&mut w, profile),
            _ => {}
        }
    }

    let file = File::create(path)?;
    let mut writer = BufWriter::new(file);
    w.doc
        .save(&mut writer)
        .map_err(|e| AppError::Pdf(e.to_string()))?;
    Ok(())
}

fn write_experience(w: &mut PdfWriter<'_>, profile: &CvProfile) {
    if profile.experience.is_empty() {
        return;
    }
    w.section_heading("EXPERIENCE");
    for exp in &profile.experience {
        w.write_line(&format!("{} at {}", exp.title, exp.company), 11.0, MARGIN_X, true);
        let dates = if exp.current {
            format!("{} - Present", exp.start_date)
        } else {
            format!("{} - {}", exp.start_date, exp.end_date)
        };
        w.write_line(&dates, 9.0, MARGIN_X, false);
        for bullet in &exp.bullets {
            if !bullet.is_empty() {
                w.write_wrapped(&format!("- {}", bullet), 9.0, BULLET_INDENT, 78);
            }
        }
        w.y -= 3.0;
    }
}

fn write_education(w: &mut PdfWriter<'_>, profile: &CvProfile) {
    if profile.education.is_empty() {
        return;
    }
    w.section_heading("EDUCATION");
    for edu in &profile.education {
        w.write_line(&format!("{} - {}", edu.degree, edu.institution), 11.0, MARGIN_X, true);
        let detail = if edu.field.is_empty() {
            edu.end_date.clone()
        } else {
            format!("{} | {}", edu.field, edu.end_date)
        };
        w.write_line(&detail, 9.0, MARGIN_X, false);
        if !edu.details.is_empty() {
            w.write_wrapped(&edu.details, 9.0, MARGIN_X, 85);
        }
        w.y -= 2.0;
    }
}

fn write_skills(w: &mut PdfWriter<'_>, profile: &CvProfile) {
    if profile.skills.is_empty() {
        return;
    }
    w.section_heading("SKILLS");
    w.write_wrapped(&profile.skills.join(", "), 10.0, MARGIN_X, 85);
}

fn write_certifications(w: &mut PdfWriter<'_>, profile: &CvProfile) {
    if profile.certifications.is_empty() {
        return;
    }
    w.section_heading("CERTIFICATIONS");
    for cert in &profile.certifications {
        w.write_line(&cert.name, 10.0, MARGIN_X, true);
        let meta = if cert.year.is_empty() {
            cert.issuer.clone()
        } else if cert.issuer.is_empty() {
            cert.year.clone()
        } else {
            format!("{} | {}", cert.issuer, cert.year)
        };
        if !meta.is_empty() {
            w.write_line(&meta, 9.0, MARGIN_X, false);
        }
        w.y -= 1.0;
    }
}

fn write_courses(w: &mut PdfWriter<'_>, profile: &CvProfile) {
    if profile.courses.is_empty() {
        return;
    }
    w.section_heading("COURSES & TRAINING");
    for course in &profile.courses {
        w.write_line(&course.name, 10.0, MARGIN_X, true);
        let mut meta_parts = Vec::new();
        if !course.provider.is_empty() {
            meta_parts.push(course.provider.as_str());
        }
        if !course.date.is_empty() {
            meta_parts.push(course.date.as_str());
        }
        if !course.format.is_empty() {
            meta_parts.push(course.format.as_str());
        }
        if !meta_parts.is_empty() {
            w.write_line(&meta_parts.join(" | "), 9.0, MARGIN_X, false);
        }
        w.y -= 1.0;
    }
}

fn write_languages(w: &mut PdfWriter<'_>, profile: &CvProfile) {
    if profile.languages.is_empty() {
        return;
    }
    w.section_heading("LANGUAGES");
    let langs: Vec<String> = profile
        .languages
        .iter()
        .map(|l| {
            if l.level.is_empty() {
                l.language.clone()
            } else {
                format!("{} ({})", l.language, l.level)
            }
        })
        .collect();
    w.write_wrapped(&langs.join(", "), 10.0, MARGIN_X, 85);
}

fn write_projects(w: &mut PdfWriter<'_>, profile: &CvProfile) {
    if profile.projects.is_empty() {
        return;
    }
    w.section_heading("PROJECTS");
    for project in &profile.projects {
        w.write_line(&project.name, 11.0, MARGIN_X, true);
        w.write_wrapped(&project.description, 9.0, BULLET_INDENT, 78);
        w.y -= 2.0;
    }
}

fn shorten_url(url: &str) -> String {
    let mut s = url.trim().to_string();
    if let Some(stripped) = s.strip_prefix("https://") {
        s = stripped.to_string();
    } else if let Some(stripped) = s.strip_prefix("http://") {
        s = stripped.to_string();
    }
    if let Some(stripped) = s.strip_prefix("www.") {
        s = stripped.to_string();
    }
    while s.ends_with('/') {
        s.pop();
    }
    s
}

fn sanitize_pdf_text(text: &str) -> String {
    text.replace('•', "-")
        .replace('\u{2013}', "-")
        .replace('\u{2014}', "-")
        .chars()
        .filter(|c| *c == '\n' || *c == '\t' || !c.is_control())
        .collect()
}

fn wrap_text(text: &str, max_chars: usize) -> Vec<String> {
    let mut lines = Vec::new();
    let mut current = String::new();
    for word in text.split_whitespace() {
        if current.is_empty() {
            current = word.to_string();
        } else if current.len() + 1 + word.len() <= max_chars {
            current.push(' ');
            current.push_str(word);
        } else {
            lines.push(current);
            current = word.to_string();
        }
    }
    if !current.is_empty() {
        lines.push(current);
    }
    lines
}
