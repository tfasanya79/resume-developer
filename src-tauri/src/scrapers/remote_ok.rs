use crate::db::models::JobListing;
use crate::error::{AppError, AppResult};
use crate::scrapers::listing_from_parts;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct RemoteOkJob {
    id: String,
    position: String,
    company: String,
    location: String,
    #[serde(default)]
    salary_min: Option<i64>,
    #[serde(default)]
    salary_max: Option<i64>,
    url: String,
    description: String,
    #[serde(default)]
    tags: Vec<String>,
}

pub fn fetch_remote_ok(remote_only: bool) -> AppResult<Vec<JobListing>> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let response = client
        .get("https://remoteok.com/api")
        .header("User-Agent", "LocalCVBuilder/1.0")
        .send()?;

    if !response.status().is_success() {
        return Err(AppError::Other(format!(
            "RemoteOK API returned {}",
            response.status()
        )));
    }

    let raw: Vec<serde_json::Value> = response.json()?;
    let mut listings = Vec::new();

    for item in raw.into_iter().skip(1) {
        let job: RemoteOkJob = match serde_json::from_value(item) {
            Ok(j) => j,
            Err(_) => continue,
        };

        if remote_only && !job.location.to_lowercase().contains("remote") {
            continue;
        }

        let salary = match (job.salary_min, job.salary_max) {
            (Some(min), Some(max)) => format!("${min}-${max}"),
            (Some(min), None) => format!("${min}+"),
            _ => String::new(),
        };

        let description = if job.description.is_empty() {
            job.tags.join(", ")
        } else {
            format!("{}\n\nSkills: {}", job.description, job.tags.join(", "))
        };

        listings.push(listing_from_parts(
            &job.position,
            &job.company,
            &job.location,
            &salary,
            &job.url,
            &description,
            "remote_ok",
        ));
    }

    Ok(listings)
}
