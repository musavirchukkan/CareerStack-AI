## [2.3.1](https://github.com/musavirchukkan/CareerStack-AI/compare/v2.3.0...v2.3.1) (2026-02-23)


### Bug Fixes

* trigger release pipeline ([b9c4d07](https://github.com/musavirchukkan/CareerStack-AI/commit/b9c4d073b0ef097d2c3cfc1b9fcc89161c0c77c4))

# [2.3.0](https://github.com/musavirchukkan/CareerStack-AI/compare/v2.2.2...v2.3.0) (2026-02-23)


### Features

* notion schema validation and ai credential refactor ([6393e35](https://github.com/musavirchukkan/CareerStack-AI/commit/6393e359cf95f7b5a23461832d607690107c1361))

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.2.2](https://github.com/musavirchukkan/CareerStack-AI/compare/v2.2.1...v2.2.2) (2026-02-23)

### [2.2.1](https://github.com/musavirchukkan/CareerStack-AI/compare/v2.2.0...v2.2.1) (2026-02-22)


### Bug Fixes

* Refactor popup inter-process communication and error handling ([#5](https://github.com/musavirchukkan/CareerStack-AI/issues/5)) ([77314df](https://github.com/musavirchukkan/CareerStack-AI/commit/77314df20e70ac7d78d52065b7b035b8e8a069a5))

## [2.2.0](https://github.com/musavirchukkan/CareerStack-AI/compare/v2.1.1...v2.2.0) (2026-02-22)


### Features

* **core:** implement production readiness checklist ([#4](https://github.com/musavirchukkan/CareerStack-AI/issues/4)) ([3352dad](https://github.com/musavirchukkan/CareerStack-AI/commit/3352dad194f8237beec9049b8eb6d1f051c75f8f))

### [2.1.1](https://github.com/musavirchukkan/CareerStack-AI/compare/v2.1.0...v2.1.1) (2026-02-22)

## [2.1.0](https://github.com/musavirchukkan/CareerStack-AI/compare/v2.0.1...v2.1.0) (2026-02-22)


### Features

* Implement semantic release and conventional commits for automated versioning and releases. ([38aa218](https://github.com/musavirchukkan/CareerStack-AI/commit/38aa21873851922df44c40591093abe94f364c87))


### Bug Fixes

* sync manifest.json during semantic release and use PAT ([dfe1281](https://github.com/musavirchukkan/CareerStack-AI/commit/dfe128155c97e17a6fb1048409e4bb742cd830b0))
* test semantic release bot ([8e3a84e](https://github.com/musavirchukkan/CareerStack-AI/commit/8e3a84ee0ebb43e55a2a031471786240709b660e))

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
