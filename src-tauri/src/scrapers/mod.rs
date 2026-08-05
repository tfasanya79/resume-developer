pub mod arbeitnow;
pub mod remote_ok;

use crate::db::models::{CvProfile, JobListing, ScraperProgress};
use crate::db::queries::save_job_listing;
use crate::db::DbState;
use crate::error::AppResult;
use crate::nlp::config::OllamaConfig;
use crate::semantic::match_engine::compute_match_with_config;
use chrono::Utc;
use uuid::Uuid;

pub fn run_scrapers(
    state: &DbState,
    cv: Option<&CvProfile>,
    remote_ok_enabled: bool,
    remote_only: bool,
    arbeitnow_enabled: bool,
    ollama_config: Option<&OllamaConfig>,
) -> AppResult<Vec<ScraperProgress>> {
    let mut progress = Vec::new();

    if remote_ok_enabled {
        let listings = remote_ok::fetch_remote_ok(remote_only)?;
        let fetched = listings.len();
        for mut listing in listings {
            if let Some(cv) = cv {
                let result = compute_match_with_config(cv, &listing.description, ollama_config);
                listing.match_score = Some(result.score);
            }
            save_job_listing(state, &listing)?;
        }
        progress.push(ScraperProgress {
            source: "RemoteOK".into(),
            fetched,
            message: format!("Fetched {fetched} listings"),
        });
    }

    if arbeitnow_enabled {
        let listings = arbeitnow::fetch_arbeitnow(remote_only)?;
        let fetched = listings.len();
        for mut listing in listings {
            if let Some(cv) = cv {
                let result = compute_match_with_config(cv, &listing.description, ollama_config);
                listing.match_score = Some(result.score);
            }
            save_job_listing(state, &listing)?;
        }
        progress.push(ScraperProgress {
            source: "Arbeitnow".into(),
            fetched,
            message: format!("Fetched {fetched} listings"),
        });
    }

    Ok(progress)
}

pub fn listing_from_parts(
    title: &str,
    company: &str,
    location: &str,
    salary: &str,
    url: &str,
    description: &str,
    source: &str,
) -> JobListing {
    JobListing {
        id: Uuid::new_v4().to_string(),
        title: title.to_string(),
        company: company.to_string(),
        location: location.to_string(),
        salary: salary.to_string(),
        url: url.to_string(),
        description: description.to_string(),
        source: source.to_string(),
        match_score: None,
        created_at: Utc::now().to_rfc3339(),
    }
}
