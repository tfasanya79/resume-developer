use crate::db::models::*;
use crate::db::DbState;
use crate::error::{AppError, AppResult};
use chrono::Utc;
use rusqlite::params;
use uuid::Uuid;

fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

pub fn save_cv(state: &DbState, profile: &mut CvProfile) -> AppResult<String> {
    let conn = state.conn.lock().map_err(|_| AppError::Other("DB lock poisoned".into()))?;
    let now = now_iso();
    if profile.id.is_empty() {
        profile.id = Uuid::new_v4().to_string();
        profile.created_at = now.clone();
    }
    profile.updated_at = now;

    let section_order_json = serde_json::to_string(&profile.section_order)?;

    conn.execute(
        "INSERT INTO cv_profiles (id, name, template, parent_cv_id, job_id, section_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(id) DO UPDATE SET
           name=?2, template=?3, parent_cv_id=?4, job_id=?5, section_order=?6, updated_at=?8",
        params![
            profile.id,
            profile.name,
            profile.template,
            profile.parent_cv_id,
            profile.job_id,
            section_order_json,
            profile.created_at,
            profile.updated_at,
        ],
    )?;

    conn.execute("DELETE FROM cv_sections WHERE cv_id = ?1", params![profile.id])?;

    let sections = [
        ("personal", serde_json::to_string(&profile.personal)?),
        ("professional_title", serde_json::to_string(&profile.professional_title)?),
        ("experience", serde_json::to_string(&profile.experience)?),
        ("education", serde_json::to_string(&profile.education)?),
        ("skills", serde_json::to_string(&profile.skills)?),
        ("projects", serde_json::to_string(&profile.projects)?),
        ("certifications", serde_json::to_string(&profile.certifications)?),
        ("courses", serde_json::to_string(&profile.courses)?),
        ("languages", serde_json::to_string(&profile.languages)?),
        ("competence_notes", serde_json::to_string(&profile.competence_notes)?),
        ("source_filename", serde_json::to_string(&profile.source_filename)?),
        ("design", serde_json::to_string(&profile.design)?),
    ];

    for (section_type, data) in sections {
        conn.execute(
            "INSERT INTO cv_sections (cv_id, section_type, data) VALUES (?1, ?2, ?3)",
            params![profile.id, section_type, data],
        )?;
    }

    Ok(profile.id.clone())
}

pub fn load_cv(state: &DbState, id: &str) -> AppResult<CvProfile> {
    let conn = state.conn.lock().map_err(|_| AppError::Other("DB lock poisoned".into()))?;

    let row = conn
        .query_row(
            "SELECT id, name, template, parent_cv_id, job_id, section_order, created_at, updated_at
             FROM cv_profiles WHERE id = ?1",
            params![id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, String>(7)?,
                ))
            },
        )
        .map_err(|_| AppError::NotFound(format!("CV {id} not found")))?;

    let mut stmt = conn.prepare(
        "SELECT section_type, data FROM cv_sections WHERE cv_id = ?1",
    )?;
    let sections: Vec<(String, String)> = stmt
        .query_map(params![id], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut personal = PersonalInfo::default();
    let mut professional_title = String::new();
    let mut experience = Vec::new();
    let mut education = Vec::new();
    let mut skills = Vec::new();
    let mut projects = Vec::new();
    let mut certifications = Vec::new();
    let mut courses = Vec::new();
    let mut languages = Vec::new();
    let mut competence_notes = Vec::new();
    let mut source_filename: Option<String> = None;
    let mut design = CvDesign::default();

    for (section_type, data) in sections {
        match section_type.as_str() {
            "personal" => personal = serde_json::from_str(&data)?,
            "professional_title" => professional_title = serde_json::from_str(&data)?,
            "experience" => experience = serde_json::from_str(&data)?,
            "education" => education = serde_json::from_str(&data)?,
            "skills" => skills = serde_json::from_str(&data)?,
            "projects" => projects = serde_json::from_str(&data)?,
            "certifications" => certifications = serde_json::from_str(&data)?,
            "courses" => courses = serde_json::from_str(&data).unwrap_or_default(),
            "languages" => languages = serde_json::from_str(&data)?,
            "competence_notes" => competence_notes = serde_json::from_str(&data)?,
            "source_filename" => source_filename = serde_json::from_str(&data)?,
            "design" => design = serde_json::from_str(&data).unwrap_or_default(),
            _ => {}
        }
    }

    let section_order: Vec<String> = serde_json::from_str(&row.5).unwrap_or_else(|_| {
        vec![
            "personal".into(),
            "experience".into(),
            "education".into(),
            "skills".into(),
            "certifications".into(),
            "courses".into(),
            "projects".into(),
            "languages".into(),
        ]
    });

    Ok(CvProfile {
        id: row.0,
        name: row.1,
        template: row.2,
        parent_cv_id: row.3,
        job_id: row.4,
        section_order,
        professional_title,
        personal,
        experience,
        education,
        skills,
        projects,
        certifications,
        courses,
        languages,
        competence_notes,
        design,
        source_filename,
        created_at: row.6,
        updated_at: row.7,
    })
}

pub fn list_cvs(state: &DbState) -> AppResult<Vec<CvSummary>> {
    let conn = state.conn.lock().map_err(|_| AppError::Other("DB lock poisoned".into()))?;
    let mut stmt = conn.prepare(
        "SELECT id, name, template, updated_at FROM cv_profiles ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(CvSummary {
            id: row.get(0)?,
            name: row.get(1)?,
            template: row.get(2)?,
            updated_at: row.get(3)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

pub fn delete_cv(state: &DbState, id: &str) -> AppResult<()> {
    let conn = state.conn.lock().map_err(|_| AppError::Other("DB lock poisoned".into()))?;
    conn.execute("DELETE FROM cv_profiles WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_settings(state: &DbState) -> AppResult<AppSettings> {
    let conn = state.conn.lock().map_err(|_| AppError::Other("DB lock poisoned".into()))?;
    let mut settings = AppSettings::default();
    let mut stmt = conn.prepare("SELECT key, value FROM app_settings")?;
    let rows = stmt.query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))?;
    for row in rows {
        let (key, value) = row?;
        match key.as_str() {
            "theme" => settings.theme = value,
            "default_template" => settings.default_template = value,
            "export_path" => settings.export_path = value,
            "ollama_url" => settings.ollama_url = value,
            "ollama_model" => settings.ollama_model = value,
            "ollama_temperature" => settings.ollama_temperature = value.parse().unwrap_or(0.3),
            "embed_model" => settings.embed_model = value,
            "scraper_remote_ok" => settings.scraper_remote_ok = value == "true",
            "scraper_remote_only" => settings.scraper_remote_only = value == "true",
            "scraper_arbeitnow" => settings.scraper_arbeitnow = value == "true",
            _ => {}
        }
    }
    Ok(settings)
}

pub fn save_settings(state: &DbState, settings: &AppSettings) -> AppResult<()> {
    let conn = state.conn.lock().map_err(|_| AppError::Other("DB lock poisoned".into()))?;
    let pairs = [
        ("theme", settings.theme.clone()),
        ("default_template", settings.default_template.clone()),
        ("export_path", settings.export_path.clone()),
        ("ollama_url", settings.ollama_url.clone()),
        ("ollama_model", settings.ollama_model.clone()),
        ("ollama_temperature", settings.ollama_temperature.to_string()),
        ("embed_model", settings.embed_model.clone()),
        ("scraper_remote_ok", settings.scraper_remote_ok.to_string()),
        ("scraper_remote_only", settings.scraper_remote_only.to_string()),
        ("scraper_arbeitnow", settings.scraper_arbeitnow.to_string()),
    ];
    for (key, value) in pairs {
        conn.execute(
            "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = ?2",
            params![key, value],
        )?;
    }
    Ok(())
}

pub fn save_application(state: &DbState, app: &mut JobApplication) -> AppResult<String> {
    let conn = state.conn.lock().map_err(|_| AppError::Other("DB lock poisoned".into()))?;
    let now = now_iso();
    if app.id.is_empty() {
        app.id = Uuid::new_v4().to_string();
        app.created_at = now.clone();
    }
    app.updated_at = now;
    conn.execute(
        "INSERT INTO job_applications (id, title, company, status, notes, cv_version_id, applied_at, reminder_at, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
         ON CONFLICT(id) DO UPDATE SET title=?2, company=?3, status=?4, notes=?5, cv_version_id=?6, applied_at=?7, reminder_at=?8, updated_at=?10",
        params![
            app.id, app.title, app.company, app.status, app.notes,
            app.cv_version_id, app.applied_at, app.reminder_at,
            app.created_at, app.updated_at,
        ],
    )?;
    Ok(app.id.clone())
}

pub fn list_applications(state: &DbState) -> AppResult<Vec<JobApplication>> {
    let conn = state.conn.lock().map_err(|_| AppError::Other("DB lock poisoned".into()))?;
    let mut stmt = conn.prepare(
        "SELECT id, title, company, status, notes, cv_version_id, applied_at, reminder_at, created_at, updated_at
         FROM job_applications ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(JobApplication {
            id: row.get(0)?,
            title: row.get(1)?,
            company: row.get(2)?,
            status: row.get(3)?,
            notes: row.get(4)?,
            cv_version_id: row.get(5)?,
            applied_at: row.get(6)?,
            reminder_at: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

pub fn delete_application(state: &DbState, id: &str) -> AppResult<()> {
    let conn = state.conn.lock().map_err(|_| AppError::Other("DB lock poisoned".into()))?;
    conn.execute("DELETE FROM job_applications WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn save_job_description(state: &DbState, jd: &mut JobDescription) -> AppResult<String> {
    let conn = state.conn.lock().map_err(|_| AppError::Other("DB lock poisoned".into()))?;
    if jd.id.is_empty() {
        jd.id = Uuid::new_v4().to_string();
        jd.created_at = now_iso();
    }
    let keywords = serde_json::to_string(&jd.parsed_keywords)?;
    conn.execute(
        "INSERT INTO job_descriptions (id, raw_text, parsed_keywords, created_at)
         VALUES (?1,?2,?3,?4)
         ON CONFLICT(id) DO UPDATE SET raw_text=?2, parsed_keywords=?3",
        params![jd.id, jd.raw_text, keywords, jd.created_at],
    )?;
    Ok(jd.id.clone())
}

pub fn save_job_listing(state: &DbState, listing: &JobListing) -> AppResult<()> {
    let conn = state.conn.lock().map_err(|_| AppError::Other("DB lock poisoned".into()))?;
    conn.execute(
        "INSERT INTO job_listings (id, title, company, location, salary, url, description, source, match_score, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
         ON CONFLICT(id) DO UPDATE SET title=?2, company=?3, location=?4, salary=?5, url=?6, description=?7, source=?8, match_score=?9",
        params![
            listing.id, listing.title, listing.company, listing.location,
            listing.salary, listing.url, listing.description, listing.source,
            listing.match_score, listing.created_at,
        ],
    )?;
    Ok(())
}

pub fn list_job_listings(state: &DbState) -> AppResult<Vec<JobListing>> {
    let conn = state.conn.lock().map_err(|_| AppError::Other("DB lock poisoned".into()))?;
    let mut stmt = conn.prepare(
        "SELECT id, title, company, location, salary, url, description, source, match_score, created_at
         FROM job_listings ORDER BY match_score DESC NULLS LAST, created_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(JobListing {
            id: row.get(0)?,
            title: row.get(1)?,
            company: row.get(2)?,
            location: row.get(3)?,
            salary: row.get(4)?,
            url: row.get(5)?,
            description: row.get(6)?,
            source: row.get(7)?,
            match_score: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

pub fn save_interview_session(state: &DbState, session: &InterviewSession) -> AppResult<()> {
    let conn = state.conn.lock().map_err(|_| AppError::Other("DB lock poisoned".into()))?;
    let questions = serde_json::to_string(&session.questions)?;
    conn.execute(
        "INSERT INTO interview_sessions (id, questions, notes, score, created_at)
         VALUES (?1,?2,?3,?4,?5)
         ON CONFLICT(id) DO UPDATE SET questions=?2, notes=?3, score=?4",
        params![session.id, questions, session.notes, session.score, now_iso()],
    )?;
    Ok(())
}

pub fn list_interview_sessions(state: &DbState) -> AppResult<Vec<InterviewSession>> {
    let conn = state.conn.lock().map_err(|_| AppError::Other("DB lock poisoned".into()))?;
    let mut stmt = conn.prepare(
        "SELECT id, questions, notes, score FROM interview_sessions ORDER BY created_at DESC LIMIT 20",
    )?;
    let rows = stmt.query_map([], |row| {
        let questions_json: String = row.get(1)?;
        Ok(InterviewSession {
            id: row.get(0)?,
            questions: serde_json::from_str(&questions_json).unwrap_or_default(),
            notes: row.get(2)?,
            score: row.get(3)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}
