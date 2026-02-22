# Changelog

All notable changes to CareerStack AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2026-02-22

### Fixed
- **Retry logic** — API calls auto-retry 3× on server errors with exponential backoff (1s → 2s → 4s)
- **User-friendly errors** — Actionable error messages for Notion (auth, permissions, not found) and AI (invalid key, quota)
- **Duplicate detection** — Checks Notion DB by Source URL before saving, warns if duplicate found
- **Rate limiting** — Operation locks prevent double-clicking Analyze and Save buttons

## [2.0.0] - 2026-02-22

### Changed
- **Complete TypeScript migration** — All source code rewritten in TypeScript with strict type checking
- **Vite build system** — Replaced manual zip packaging with Vite + `vite-plugin-web-extension`
- **Modular architecture** — Content scripts now use proper ES module imports instead of global scope
- **Bundled content script** — 6 separate injected scripts consolidated into a single optimized bundle
- **CI pipeline** — GitHub Actions now includes TypeScript type-checking before builds
- **Semver versioning** — Adopted `MAJOR.MINOR.PATCH` format going forward

### Added
- Shared TypeScript interfaces for all data types (job data, AI results, Notion payloads)
- `npm run dev` — Watch mode with auto-rebuild for development
- `npm run typecheck` — Standalone type-checking command
- `npm run zip` — Build + package for Chrome Web Store submission

## [1.0.0] - 2026-02-19

### Added
- Initial release
- Job scraping from LinkedIn and Indeed
- AI-powered job match analysis (Gemini & OpenAI)
- One-click save to Notion database
- Session caching for scraped data and AI results
- Options page for API key and resume configuration
- Smart CSS selector fallback system for resilient scraping
- Email extraction from job descriptions

[2.0.1]: https://github.com/musavirchukkan/CareerStack-AI/releases/tag/v2.0.1
[2.0.0]: https://github.com/musavirchukkan/CareerStack-AI/releases/tag/v2.0.0
[1.0.0]: https://github.com/musavirchukkan/CareerStack-AI/releases/tag/v1.0.0
