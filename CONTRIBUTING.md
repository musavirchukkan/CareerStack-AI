# Contributing to CareerStack AI

Thanks for your interest in contributing! This document explains our development workflow, specifically our automated release pipeline and commit message conventions.

---

## 🚀 The Release Pipeline

This project uses **Fully Automated Semantic Versioning**. You **never** need to manually update the version number in `package.json` or `manifest.json`.

Instead, our GitHub Actions bot reads your commit messages when they are merged into the `main` branch. Based on the formatting of your commits, the bot will automatically calculate the new version, generate the changelog, create a tag, and publish the release.

> **⚠️ THE SQUASH TRAP (Important for PRs)**
> If you are using "Squash and Merge" for Pull Requests, GitHub throws away all your individual branch commit messages and creates **one single commit** on main.
> Therefore, **the PR Title itself** must be formatted as a Conventional Commit (e.g. `feat: added dark mode`), otherwise the bot will see "Merge PR #4" and will safely ignore it, meaning **no release will happen.**

---

## 📝 Commit Message Conventions (Crucial)

To make the automation work, we strictly follow the [Conventional Commits](https://www.conventionalcommits.org/) standard. **Every commit message must start with a specific prefix.**

### 1. Commits that Trigger a Release

Use these when you are changing the actual extension code that the user will interact with.

| Prefix                         | What it means                                                                                 | Version Bump                  | Example                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------- |
| **`fix:`**                     | You fixed a bug.                                                                              | **PATCH** (`1.0.0` → `1.0.1`) | `fix: job title not scraping on LinkedIn`    |
| **`feat:`**                    | You added a new feature.                                                                      | **MINOR** (`1.0.0` → `1.1.0`) | `feat: added Dark Mode toggle`               |
| **`feat!:`**<br>or **`fix!:`** | The `!` means **BREAKING CHANGE**. You changed something that breaks backwards compatibility. | **MAJOR** (`1.0.0` → `2.0.0`) | `feat!: completely changed Notion DB schema` |

### 2. Commits that DO NOT Trigger a Release (Maintenance)

Use these when you are cleaning the repo, updating docs, or refactoring. The bot will save these changes, but it **will not cut a new version right now.**

_The users will eventually receive these updates bundled together during the very next `fix:` or `feat:` release._

| Prefix          | When to use it                                       | Example                                            |
| --------------- | ---------------------------------------------------- | -------------------------------------------------- |
| **`docs:`**     | Updating `README.md`, `ISSUES.md`, or code comments. | `docs: updated readme with new Notion fields`      |
| **`chore:`**    | Maintenance, updating dependencies, changing CI/CD.  | `chore: update vite to version 6.0`                |
| **`refactor:`** | Rewriting code without changing how it works.        | `refactor: move NotionAPI logic to separate class` |
| **`style:`**    | Formatting changes (spaces, tabs). No logic changes. | `style: run prettier on all files`                 |
| **`test:`**     | Adding or fixing unit/E2E tests.                     | `test: add unit tests for duplicate detection`     |

---

## 🛠️ Edge Case: Forcing a "Chore" Release Immediately

Sometimes you might update an insecure package dependency (`chore:`) and you need users to get that update _immediately_, rather than waiting for the next feature release.

Because `chore:` does not trigger the bot, you can force a release by pushing an empty commit with the `fix:` prefix:

```bash
git commit --allow-empty -m "fix: trigger release for security updates"
git push origin your-branch
```

When this merges to `main`, the bot sees the `fix:`, bumps the Patch version, and ships all your pending chores immediately!

---

## 💻 Local Development

If you want instructions on how to run the project locally, run dev servers, or build the ZIP manually, please check out the **[BUILD.md](./BUILD.md)** file!
