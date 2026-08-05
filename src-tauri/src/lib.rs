mod commands;
mod db;
mod error;
mod export;
mod import;
mod nlp;
mod scrapers;
mod semantic;

use db::init_db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            init_db(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::save_cv,
            commands::load_cv,
            commands::list_cvs,
            commands::delete_cv,
            commands::export_pdf,
            commands::get_settings,
            commands::save_settings,
            commands::save_application,
            commands::list_applications,
            commands::delete_application,
            commands::save_job_description,
            commands::match_job_description,
            commands::tailor_cv_for_job,
            commands::generate_cover_letter,
            commands::run_job_scraper,
            commands::list_job_listings,
            commands::analyze_skill_gap,
            commands::generate_interview_questions,
            commands::optimize_linkedin,
            commands::get_salary_insights,
            commands::export_portfolio,
            commands::import_cv_pdf,
            commands::suggest_cv_improvements,
            commands::compute_ats_report,
            commands::rewrite_experience_bullet_cmd,
            commands::propose_tailor_cv,
            commands::apply_tailor_proposal,
            commands::list_interview_sessions,
            commands::score_interview_answer_cmd,
            commands::debug_log_line,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
