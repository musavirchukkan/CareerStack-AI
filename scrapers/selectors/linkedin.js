/**
 * LinkedIn CSS Selectors — Centralized Configuration
 *
 * When LinkedIn changes their DOM, update selectors HERE instead of in the scraper logic.
 * Each field has an array of selectors tried in order (first match wins).
 *
 * Loaded as a classic content script before LinkedInScraper.js
 */
const LINKEDIN_SELECTORS = {

    // ─── Page Detection ──────────────────────────────────────────
    // These detect which scraping strategy to use (detail container vs single page)
    container: [
        '.jobs-search__right-rail',
        '.jobs-details__main-content',
        '[data-view-name="job-detail-page"]'
    ],

    // ─── Strategy 1: Detail Container (Search / Collections / Recommended) ───
    detail: {
        title: [
            '.job-details-jobs-unified-top-card__job-title',
            'h2.t-24',
            '.t-24.job-details-jobs-unified-top-card__job-title'
        ],
        company: [
            '.job-details-jobs-unified-top-card__company-name',
            '.jobs-unified-top-card__company-name',
            '[aria-label^="Company, "] a'
        ],
        // Fallback: extract company name from aria-label="Company, Xyz."
        companyAria: '[aria-label^="Company, "]',
        salary: [
            '.jobs-unified-top-card__salary-info',
            '.job-details-jobs-unified-top-card__salary-info'
        ],
        description: [
            '[data-sdui-component*="aboutTheJob"] [data-testid="expandable-text-box"]',
            '[componentkey*="AboutTheJob"] [data-testid="expandable-text-box"]',
            '#job-details',
            '.jobs-description-content__text',
            '.jobs-description__content .jobs-box__html-content',
            '.jobs-description__container',
            '[class*="jobs-description"]'
        ],
        apply: [
            '.jobs-apply-button--top-card a',
            '.jobs-apply-button--top-card button',
            '.jobs-s-apply button',
            '[data-control-name="jobdetails_topcard_inapply"]',
            '.jobs-unified-top-card__start-application-button'
        ],
        topCard: [
            '.job-details-jobs-unified-top-card__content--two-pane',
            '.jobs-unified-top-card'
        ]
    },

    // ─── Strategy 2: Single Job Page (Direct /jobs/view/ URL) ────
    single: {
        title: [
            'h1.top-card-layout__title',
            '.jobs-unified-top-card__job-title',
            '.job-details-jobs-unified-top-card__job-title'
        ],
        company: [
            '.top-card-layout__first-subline .topcard__org-name-link',
            '.job-details-jobs-unified-top-card__company-name',
            '.jobs-unified-top-card__company-name',
            '[aria-label^="Company, "] a'
        ],
        companyAria: '[aria-label^="Company, "]',
        companyTopSection: [
            '.top-card-layout',
            '.job-details-jobs-unified-top-card__container',
            '[data-view-name="job-detail-page"]'
        ],
        companyLink: 'a[href*="/company/"]',
        description: [
            '[data-sdui-component*="aboutTheJob"] [data-testid="expandable-text-box"]',
            '[componentkey*="AboutTheJob"] [data-testid="expandable-text-box"]',
            '#job-details',
            '.jobs-description-content__text',
            '.jobs-description__content .jobs-box__html-content',
            '.jobs-description__container',
            '.show-more-less-html__markup',
            '[class*="jobs-description"]',
            'article .jobs-description'
        ],
    },

    // ─── Shared: Apply Link (works on all page types) ────────────
    directApply: 'a[aria-label^="Apply on company website"]',
    ldJson: 'script[type="application/ld+json"]'
};
