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

### Using `npm version` (Recommended)
This automatically bumps `package.json` + `src/manifest.json`, commits, and creates a git tag:

```bash
# Bug fix (2.0.1 → 2.0.2)
npm version patch -m "chore: Bump to %s"

# New feature (2.0.1 → 2.1.0)
npm version minor -m "chore: Bump to %s"

# Breaking change (2.0.1 → 3.0.0)
npm version major -m "chore: Bump to %s"

# Then push to trigger GitHub Actions release
git push origin main --tags
```

### What Happens on Push
The workflow is defined in `.github/workflows/build.yml`.

- **Push to `main` or PR**: Install → TypeScript type check → Vite build → Upload artifact.
- **Push a version tag** (`v*`): All of the above + Creates a **GitHub Release** with `extension.zip` attached and auto-generated release notes.

### Accessing Releases
1. Go to the **Releases** section in the right sidebar of the GitHub repository.
2. Download `extension.zip` from the relevant version.
