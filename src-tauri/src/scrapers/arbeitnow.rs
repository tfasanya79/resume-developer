use crate::db::models::JobListing;
use crate::error::AppResult;
use crate::scrapers::listing_from_parts;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct ArbeitnowJob {
    title: String,
    company_name: String,
    location: String,
    url: String,
    description: String,
}

#[derive(Debug, Deserialize)]
struct ArbeitnowResponse {
    data: Vec<ArbeitnowJob>,
}

pub fn fetch_arbeitnow(remote_only: bool) -> AppResult<Vec<JobListing>> {
    let url = "https://www.arbeitnow.com/api/job-board-api";
    let response = reqwest::blocking::Client::new()
        .get(url)
        .header("User-Agent", "LocalCVBuilder/0.1")
        .send()?
        .json::<ArbeitnowResponse>()?;

    Ok(response
        .data
        .into_iter()
        .filter(|j| !remote_only || j.location.to_lowercase().contains("remote"))
        .take(50)
        .map(|j| {
            listing_from_parts(
                &j.title,
                &j.company_name,
                &j.location,
                "",
                &j.url,
                &j.description,
                "Arbeitnow",
            )
        })
        .collect())
}
