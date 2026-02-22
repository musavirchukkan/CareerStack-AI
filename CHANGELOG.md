# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.0.2](https://github.com/musavirchukkan/CareerStack-AI/compare/v2.1.0...v2.0.2) (2026-02-22)


### Bug Fixes

* sync manifest.json during semantic release and use PAT ([dfe1281](https://github.com/musavirchukkan/CareerStack-AI/commit/dfe128155c97e17a6fb1048409e4bb742cd830b0))

## [2.1.0](https://github.com/musavirchukkan/CareerStack-AI/compare/v2.0.1...v2.1.0) (2026-02-22)


### Features

* Implement semantic release and conventional commits for automated versioning and releases. ([38aa218](https://github.com/musavirchukkan/CareerStack-AI/commit/38aa21873851922df44c40591093abe94f364c87))

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
