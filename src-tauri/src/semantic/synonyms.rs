use std::collections::HashMap;

static SYNONYMS: &[(&str, &[&str])] = &[
    ("kubernetes", &["k8s", "kube"]),
    ("javascript", &["js", "ecmascript"]),
    ("typescript", &["ts"]),
    ("amazon web services", &["aws"]),
    ("google cloud platform", &["gcp"]),
    ("continuous integration", &["ci", "ci/cd"]),
    ("continuous delivery", &["cd", "ci/cd"]),
    ("machine learning", &["ml"]),
    ("artificial intelligence", &["ai"]),
    ("postgresql", &["postgres", "psql"]),
    ("node.js", &["node", "nodejs"]),
    ("react", &["reactjs", "react.js"]),
];

pub fn normalize_skill(skill: &str) -> String {
    skill.trim().to_lowercase()
}

pub fn skills_match(a: &str, b: &str) -> bool {
    let na = normalize_skill(a);
    let nb = normalize_skill(b);
    if na == nb || na.contains(&nb) || nb.contains(&na) {
        return true;
    }
    for (canonical, aliases) in SYNONYMS {
        let group: Vec<String> = std::iter::once(*canonical)
            .chain(aliases.iter().copied())
            .map(normalize_skill)
            .collect();
        let in_a = group.iter().any(|g| na.contains(g) || g.contains(&na));
        let in_b = group.iter().any(|g| nb.contains(g) || g.contains(&nb));
        if in_a && in_b {
            return true;
        }
    }
    false
}

pub fn expand_keywords(keywords: &[String]) -> Vec<String> {
    let mut out: HashMap<String, bool> = HashMap::new();
    for kw in keywords {
        let n = normalize_skill(kw);
        out.insert(n.clone(), true);
        for (canonical, aliases) in SYNONYMS {
            let group: Vec<String> = std::iter::once(*canonical)
                .chain(aliases.iter().copied())
                .map(normalize_skill)
                .collect();
            if group.iter().any(|g| n.contains(g) || g.contains(&n)) {
                for g in group {
                    out.insert(g, true);
                }
            }
        }
    }
    out.keys().cloned().collect()
}

pub fn keyword_in_text(keyword: &str, text: &str) -> bool {
    let lower = text.to_lowercase();
    let expanded = expand_keywords(&[keyword.to_string()]);
    expanded.iter().any(|k| lower.contains(k))
}
