pub mod models;
pub mod queries;
pub mod schema;

use crate::error::AppResult;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

pub struct DbState {
    pub conn: Mutex<Connection>,
}

impl DbState {
    pub fn new(path: PathBuf) -> AppResult<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = Connection::open(path)?;
        schema::run_migrations(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }
}

pub fn init_db(app: &tauri::App) -> AppResult<()> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| crate::error::AppError::Other(e.to_string()))?;
    let db_path = data_dir.join("local_cv_builder.db");
    let state = DbState::new(db_path)?;
    app.manage(state);
    Ok(())
}
