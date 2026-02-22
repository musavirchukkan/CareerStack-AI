# Privacy Policy — CareerStack AI

**Last updated:** February 22, 2026

CareerStack AI is a Chrome extension that helps job seekers track applications by scraping job details from LinkedIn and Indeed, running AI-powered match analysis, and saving structured entries to the user's Notion database.

## Data We Collect

### 1. User-Provided Data
- **API Keys** — Notion Integration Secret, Notion Database ID, and AI provider API key (Gemini or OpenAI). Stored locally in `chrome.storage.sync`.
- **Master Resume** — Plain text resume pasted by the user for AI match scoring. Stored locally in `chrome.storage.local`.

### 2. Automatically Collected Data
- **Job Posting Content** — Company name, job title, salary, job description, and application links scraped from the DOM of LinkedIn and Indeed job pages when the user clicks the extension icon.
- **Recruiter Email** — Email addresses extracted from job descriptions via pattern matching and AI analysis.
- **Active Tab URL** — The URL of the currently active tab, used solely to determine if the page is a supported job board.

## How We Use Data

All collected data is used **exclusively** to provide the extension's core functionality:

| Data | Purpose |
|------|---------|
| API Keys | Authenticate requests to Notion, Gemini, and OpenAI APIs |
| Master Resume | Sent to the user's chosen AI provider for job match scoring |
| Job Posting Content | Displayed in the popup for review, sent to Notion for saving |
| Active Tab URL | Determine if the current page is LinkedIn or Indeed |

## Data Storage

- All data is stored **locally** on the user's device using Chrome's built-in storage APIs (`chrome.storage.sync`, `chrome.storage.local`, `chrome.storage.session`).
- **No data is stored on any external server controlled by us.**
- Session cache (scraped job data) is automatically cleared when the browser session ends.

## Third-Party Services

Data is sent **only** to services the user explicitly configures with their own credentials:

| Service | Data Sent | Purpose |
|---------|-----------|---------|
| **Notion API** (`api.notion.com`) | Job details, description | Save job entries to user's database |
| **Google Gemini API** (`generativelanguage.googleapis.com`) | Resume + job description | AI match scoring (if selected) |
| **OpenAI API** (`api.openai.com`) | Resume + job description | AI match scoring (if selected) |

No data is sent to any service without the user's explicit action (clicking "Run AI Analysis" or "Save to Notion").

## Data Sharing

- We do **not** sell, trade, or transfer user data to any third party.
- We do **not** use data for advertising, analytics, or profiling.
- We do **not** collect telemetry or usage statistics.

## Data Security

- API keys are stored using Chrome's encrypted storage APIs.
- All API communication uses HTTPS.
- No intermediate server is involved — all requests go directly from the extension to the respective APIs.

## User Control

Users can at any time:
- **Delete all stored data** by removing the extension from Chrome.
- **Modify or clear settings** via the extension's Options page.
- **Clear cached data** using the "Clear Cache" button in the popup.

## Children's Privacy

This extension is not directed at children under 13 and does not knowingly collect data from children.

## Changes to This Policy

Any updates to this policy will be reflected on this page with an updated date.

## Contact

For questions about this privacy policy, please open an issue at:  
[https://github.com/musavirchukkan/CareerStack-AI/issues](https://github.com/musavirchukkan/CareerStack-AI/issues)
