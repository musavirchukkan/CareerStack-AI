# Build & Release Documentation

## Overview

This project uses **TypeScript + Vite** for development and builds, with **GitHub Actions** for continuous integration and release management.

## Build Prerequisites

- Node.js (v20 or later recommended)

## Local Development

1.  **Install dependencies**:

    ```bash
    npm install
    ```

2.  **Development mode** (auto-rebuild on changes):

    ```bash
    npm run dev
    ```

    Then load `dist/` as an unpacked extension in Chrome.

3.  **Production build**:

    ```bash
    npm run build
    ```

    Output goes to `dist/`. Load this directory in Chrome via `chrome://extensions` → Developer Mode → "Load unpacked".

4.  **Type checking**:

    ```bash
    npm run typecheck
    ```

5.  **Create ZIP for Chrome Web Store**:
    ```bash
    npm run zip
    ```
    Creates `extension.zip` from `dist/`.

## Releasing a New Version

This project uses **Semantic Release** with Conventional Commits to fully automate versioning, changelog generation, and ZIP packaging.

Do not manually edit the `version` field in `package.json` or `manifest.json`.

### 1. Conventional Commits

Version numbers are calculated automatically based on commit message prefixes. When writing commit messages, use the following conventional prefixes:

- `fix:` — Patches a bug (bumps **Patch** version, e.g., `2.0.1` → `2.0.2`)
- `feat:` — Introduces a new feature (bumps **Minor** version, e.g., `2.0.1` → `2.1.0`)
- `feat!:` or `fix!:` — Introduces a breaking change (bumps **Major** version, e.g., `2.0.1` → `3.0.0`)

_Note: Prefixes like `chore:`, `docs:`, `refactor:`, and `test:` will not trigger a new release._

### 2. CI/CD Release Pipeline

The release process is fully automated via GitHub Actions (`semantic-release.yml` and `build.yml`).

The standard branching and release workflow is as follows:

1. Contributors create feature branches and use conventional commits (`feat:`, `fix:`).
2. Pull Requests are opened and merged into the `main` branch.
3. Upon merge to `main`, the **Semantic Release** workflow runs:
   - Analyzes commits since the last tag.
   - Calculates the new semantic version.
   - Updates `package.json` and syncs `src/manifest.json`.
   - Generates and writes `CHANGELOG.md`.
   - Commits changes, generates a git tag (e.g., `v2.1.0`), and pushes to `main`.
4. The tag creation triggers the **Build Extension** workflow, which compiles the extension and publishes `extension.zip` to GitHub Releases.

### 3. Accessing Built Artifacts

1. Navigate to the **Releases** section in the right sidebar of the GitHub repository.
2. Download `extension.zip` from the relevant version release.
