use crate::error::{AppError, AppResult};
use std::fs;

pub fn extract_pdf_text(path: &str) -> AppResult<String> {
    let bytes = fs::read(path)?;
    pdf_extract::extract_text_from_mem(&bytes)
        .map_err(|e| AppError::Pdf(format!("Failed to extract PDF text: {e}")))
}
