use crate::db::models::AppSettings;

#[derive(Clone, Debug)]
pub struct OllamaConfig {
    pub url: String,
    pub model: String,
    pub temperature: f64,
    pub embed_model: String,
}

impl From<&AppSettings> for OllamaConfig {
    fn from(s: &AppSettings) -> Self {
        Self {
            url: s.ollama_url.clone(),
            model: if s.ollama_model.is_empty() {
                "llama3.2".into()
            } else {
                s.ollama_model.clone()
            },
            temperature: if s.ollama_temperature <= 0.0 {
                0.3
            } else {
                s.ollama_temperature
            },
            embed_model: if s.embed_model.is_empty() {
                "nomic-embed-text".into()
            } else {
                s.embed_model.clone()
            },
        }
    }
}

pub fn strip_json_fences(text: &str) -> String {
    let trimmed = text.trim();
    if trimmed.starts_with("```") {
        trimmed
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim()
            .to_string()
    } else {
        trimmed.to_string()
    }
}
