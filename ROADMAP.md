# Roadmap

What's coming next for CareerStack AI. Feature priorities may shift based on user feedback.

> 💡 Have a feature request? [Open an issue](https://github.com/musavirchukkan/CareerStack-AI/issues/new) on GitHub!

---

## 🔜 Up Next

- **Auto-publish to Chrome Web Store** — Push a version tag, and GitHub Actions handles the rest
- **Firefox support** — Cross-browser compatibility via `webextension-polyfill`
- **ESLint integration** — Automated code quality checks in CI

## 🗓️ Planned

- **More job boards** — Glassdoor, Monster, Wellfound (AngelList)
- **Notion page link after save** — Show clickable link to the saved Notion page
- **Unit tests** — Test scraper logic, AI parsing, and Notion block generation
- **Offline detection** — Alert before attempting API calls without internet
- **Loading skeletons** — Better UX while scraping instead of blank popup
- **Scraper failure feedback** — Show which fields couldn't be scraped instead of silent blank
- **AI-extracted keywords & location** — Auto-fill Keywords and Place fields from job description

## 📐 Future Architecture

- **Auto-create Notion database** — One-click setup that creates a ready-to-use DB with all required properties, shared with the integration automatically
- **Custom field mapping** — Let users map extension fields to their own Notion property names instead of requiring exact naming
- **Storage backend alternatives** — Support for users without Notion:
  - Google Sheets export
  - Local CSV/JSON export
  - Airtable integration
  - Built-in local tracker (IndexedDB)

## 💭 Exploring

- **Analytics dashboard** — Visualize application stats (applied/rejected/interview rates)
- **Resume versioning** — Track multiple resume versions in Options
- **One-click apply** — Experimental auto-fill for job applications
- **Dark mode** — Respect system `prefers-color-scheme`
- **i18n** — Multi-language support

---

*Last updated: February 2026*
