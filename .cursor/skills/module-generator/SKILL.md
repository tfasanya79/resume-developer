---
name: module-generator
description: Generates new modules for Local CV Builder with correct architecture, naming, and boilerplate. Use when adding scrapers, CV templates, Rust commands, React pages, or database tables.
---

# Module Generator — Local CV Builder

## new-rust-command

Create a new `#[tauri::command]` in `src-tauri/src/commands.rs`:
- Use snake_case for the function name
- Accept `State<DbState>` when DB access is needed
- Return `AppResult<T>`
- Register in `src-tauri/src/lib.rs` invoke_handler
- Add TypeScript types in `src/types/cv.ts` if needed
- Call from frontend via `invoke("command_name", { ... })`

## new-react-page

Create `src/pages/{Name}Page.tsx`:
- PascalCase component name ending in `Page`
- Add route in `src/App.tsx`
- Add nav item in `src/components/Sidebar.tsx`
- Use Tailwind for styling, match existing page layout (`p-6` padding)

## new-cv-template

Create `src/templates/cv/{kebab-name}.tsx`:
- Export `{Name}Template` component accepting `{ profile: CvProfile }`
- Register in `src/components/CvPreview.tsx` templates map
- Add entry to `CV_TEMPLATES` in `src/types/cv.ts`

## new-db-table

1. Add CREATE TABLE to `src-tauri/src/db/schema.rs` (MIGRATION_V001 or new migration)
2. Add model struct to `src-tauri/src/db/models.rs`
3. Add queries to `src-tauri/src/db/queries.rs`
4. Add Tauri command in `src-tauri/src/commands.rs`
5. Add TypeScript interface in `src/types/cv.ts`

## new-scraper

Create `src-tauri/src/scrapers/{name}.rs`:
- Implement fetch function returning `AppResult<Vec<JobListing>>`
- Use `listing_from_parts()` helper from `scrapers/mod.rs`
- Register in `scrapers::run_scrapers()` in `scrapers/mod.rs`
- Add settings toggle in `AppSettings` if user-configurable
