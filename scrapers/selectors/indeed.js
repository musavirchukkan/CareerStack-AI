/**
 * Indeed CSS Selectors — Centralized Configuration
 *
 * When Indeed changes their DOM, update selectors HERE instead of in the scraper logic.
 * Each field has an array of selectors tried in order (first match wins).
 *
 * Loaded as a classic content script before IndeedScraper.js
 */
const INDEED_SELECTORS = {
    title: [
        '.jobsearch-JobInfoHeader-title',
        'h1.jobsearch-JobInfoHeader-title',
        '.jobsearch-JobInfoHeader-title-container h1',
        'h1[class*="JobInfoHeader"]'
    ],
    company: [
        '[data-company-name="true"]',
        '[data-testid="company-name"]',
        '.jobsearch-CompanyInfoContainer a',
        '.jobsearch-InlineCompanyRating a'
    ],
    salary: [
        '#salaryInfoAndJobType',
        '.jobsearch-JobMetadataHeader-item',
        '[class*="salary"]'
    ],
    description: [
        '#jobDescriptionText',
        '.jobsearch-JobComponent-description',
        '.jobsearch-jobDescriptionText',
        '#jobDescription'
    ],
    apply: [
        '#applyButtonLinkContainer a',
        '.jobsearch-IndeedApplyButton-contentWrapper a',
        'a[data-testid="indeedApplyButton"]'
    ]
};
