# Project Setup Guide

## Prerequisites

- Node.js v18+
- Rust (stable) — install via `winget install Rustlang.Rustup` or [rustup.rs](https://rustup.rs)
- npm
- Git (optional)

## Installation

```bash
git clone <your-repo-url>
cd Local_CV_Builder
npm install
```

## Development

```bash
npm run tauri dev
```

## Production Build

```bash
npm run tauri build
```

## Testing

```bash
# Rust backend
cd src-tauri && cargo test

# Frontend (when tests are added)
npm test
```

## Database

SQLite database is stored in the OS app data directory:
- Windows: `%APPDATA%\com.teems.local-cv-builder\`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `npm` not found during `tauri dev` | Fixed via `scripts/start-vite.cmd` — run `npm run tauri dev` again |
| `cargo` / `rustc` not found | Restart PowerShell after installing Rust, or run `$env:Path = [Environment]::GetEnvironmentVariable('Path','User')` then retry |
| `rustc` not found | Restart terminal after installing Rust |
| Tauri build fails | Run `cd src-tauri && cargo clean` then retry |
| Port 1420 in use | Stop other Vite processes |
