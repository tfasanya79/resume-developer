# Local CV Builder

A **local-first, privacy-preserving** desktop CV builder and job assistant built with Tauri, React, and Rust.

Your career data never leaves your machine.

## Features

- **CV Builder** — structured forms, **14 templates**, live preview, drag-and-drop section ordering, **template-faithful PDF export**
- **Real-time ATS sidebar** — score, categories, and one-click fixes while you edit
- **Import CV (PDF)** — upload an existing CV PDF, review parsed fields, then edit or tailor for a job
- **CV naming** — exports default to `CV_FirstName_LastName.pdf` (e.g. `CV_Timothy_Fasanya.pdf`)
- **Improve CV** — ATS checks, missing sections, and bullet-quality suggestions (optional Ollama rewrites)
- **Save & Export** — SQLite persistence, PDF export, portfolio HTML export
- **Application Tracker** — Kanban board, CV version links, reminder dates
- **Job Match** — hybrid semantic + keyword scoring, tailor diff review, company/role for cover letters
- **Inline bullet AI** — STAR rewrite and add-metrics per bullet (Ollama optional)
- **Job Search** — RemoteOK + Arbeitnow scrapers with semantic ranking
- **Skill Gap Analyzer** — compare skills vs job requirements
- **Interview Coach** — Ollama-generated questions + answer scoring with STAR feedback
- **LinkedIn Optimizer** — headline, summary, and experience suggestions
- **Salary Insights** — local salary range estimates and negotiation tips
- **Local AI** — optional Ollama integration with rule-based fallback

## Prerequisites

- Node.js 18+
- Rust (stable) via [rustup](https://rustup.rs)
- npm

## Quick Start

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

Installer output: `src-tauri/target/release/bundle/`

## Project Structure

```
src/              React frontend (components, pages, state, templates)
src-tauri/        Rust backend (commands, db, export, nlp, scrapers)
docs/             Setup guide and roadmap
.cursor/          Cursor rules and skills
```

## Import an existing CV

1. Open **CV Builder** and click **Import CV** (PDF).
2. Choose a PDF — files named `CV_FirstName_LastName.pdf` are recognized automatically.
3. Review parsed sections in the import modal (warnings highlight low-confidence fields).
4. **Accept & Edit** to load into the builder, or **Accept & Tailor for Job** to save and open Job Match.

Parsing uses local heuristics tuned for standard section headers (`PROFILE`, `EMPLOYMENT HISTORY`, `KEY SKILLS`, etc.). If Ollama is running and confidence is low, a local JSON fallback can fill gaps.

## Local AI (Optional)

Install [Ollama](https://ollama.com) and run a model (e.g. `ollama pull llama3.2`).  
The app auto-detects Ollama at `http://localhost:11434`. Without it, keyword-based fallbacks are used.

## License

MIT
