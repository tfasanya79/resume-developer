use crate::nlp::config::OllamaConfig;

pub fn embed_text(text: &str, config: &OllamaConfig) -> Option<Vec<f32>> {
    if text.trim().is_empty() {
        return None;
    }
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .ok()?;
    let body = serde_json::json!({
        "model": config.embed_model,
        "prompt": text
    });
    let response = client
        .post(format!("{}/api/embeddings", config.url))
        .json(&body)
        .send()
        .ok()?;
    let json: serde_json::Value = response.json().ok()?;
    let arr = json.get("embedding")?.as_array()?;
    Some(
        arr.iter()
            .filter_map(|v| v.as_f64().map(|f| f as f32))
            .collect(),
    )
}

pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f64 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let mag_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let mag_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if mag_a == 0.0 || mag_b == 0.0 {
        return 0.0;
    }
    (dot / (mag_a * mag_b)) as f64
}
