use crate::error::AppResult;
use rusqlite::Connection;

pub const MIGRATION_V001: &str = "
CREATE TABLE IF NOT EXISTS cv_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    template TEXT NOT NULL DEFAULT 'modern-professional',
    parent_cv_id TEXT,
    job_id TEXT,
    section_order TEXT NOT NULL DEFAULT '[\"personal\",\"experience\",\"education\",\"skills\",\"projects\"]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cv_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cv_id TEXT NOT NULL,
    section_type TEXT NOT NULL,
    data TEXT NOT NULL,
    FOREIGN KEY (cv_id) REFERENCES cv_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_applications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'saved',
    notes TEXT NOT NULL DEFAULT '',
    cv_version_id TEXT,
    applied_at TEXT,
    reminder_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_descriptions (
    id TEXT PRIMARY KEY,
    raw_text TEXT NOT NULL,
    parsed_keywords TEXT NOT NULL DEFAULT '[]',
    embedding_blob TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_listings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    salary TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    match_score REAL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interview_sessions (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    questions TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT '',
    score REAL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cv_sections_cv_id ON cv_sections(cv_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
";

pub fn run_migrations(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(MIGRATION_V001)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_run_successfully() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='cv_profiles'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
    }
}
