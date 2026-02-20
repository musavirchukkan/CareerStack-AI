/**
 * LinkedInScraper — Handles job data extraction from LinkedIn job pages.
 * Supports both search/collections pages (right rail) and single job view pages.
 *
 * Depends on: BaseScraper, LINKEDIN_SELECTORS, extractJobDescription
 * Loaded as a classic content script.
 */
class LinkedInScraper extends BaseScraper {
    getPlatformName() {
        return 'LinkedIn';
    }

    scrape(data) {
        data.platform = this.getPlatformName();
        const S = LINKEDIN_SELECTORS;

        // URL Cleaning
        const urlObj = new URL(window.location.href);
        const currentJobId = urlObj.searchParams.get('currentJobId');
        if (currentJobId) {
            data.url = `https://www.linkedin.com/jobs/view/${currentJobId}/`;
        } else {
            data.url = window.location.origin + window.location.pathname;
        }

        // Strategy 1: Job Collections / Search Page (Right Rail)
        const detailContainer = this._queryFirst(S.container);

        if (detailContainer) {
            this._scrapeDetailContainer(data, detailContainer);
        }
        // Strategy 2: Single Job Page (Full View)
        else {
            this._scrapeSingleJobPage(data);
        }

        // Apply Link (Direct Page — works for both strategies)
        this._scrapeDirectApplyLink(data);

        // Last Resort: LD-JSON script tags
        this._scrapeLDJson(data);

        // Fallback cleanup
        if (!data.position) data.position = document.title.split('|')[0].trim();

        // Extract email from description if available
        if (data.description) {
            const email = extractEmails(data.description);
            if (email) data.email = email;
        }

        return data;
    }

    _scrapeDetailContainer(data, detailContainer) {
        const S = LINKEDIN_SELECTORS.detail;

        // Title
        const titleEl = this._queryFirst(S.title, detailContainer);
        if (titleEl) data.position = titleEl.innerText.trim();

        // Company
        const companyEl = this._queryFirst(S.company, detailContainer);
        if (companyEl) {
            data.company = companyEl.innerText.trim();
            const link = companyEl.tagName === 'A' ? companyEl : companyEl.querySelector('a');
            if (link) {
                data.companyUrl = link.href.split('?')[0];
            }
        }

        // Salary
        const salaryEl = this._queryFirst(S.salary, detailContainer);
        if (salaryEl) data.salary = salaryEl.innerText.trim();

        // Description — try within container first, then globally
        let descEl = this._queryFirst(S.description, detailContainer);
        if (!descEl) descEl = this._queryFirst(S.description);
        if (descEl) {
            const { text, blocks } = extractJobDescription(descEl);
            data.description = text;
            data.descriptionBlocks = blocks;
        }

        // Apply Link — try selectors
        for (const selector of S.apply) {
            const el = detailContainer.querySelector(selector);
            if (el) {
                if (el.tagName === 'A') {
                    data.appLink = el.href;
                    break;
                }
                const parentLink = el.closest('a');
                if (parentLink) {
                    data.appLink = parentLink.href;
                    break;
                }
            }
        }

        // Fallback: heuristic — find button/link with "Apply" text
        if (!data.appLink) {
            const topCard = this._queryFirst(S.topCard, detailContainer) || detailContainer;

            const buttons = topCard.querySelectorAll('button, a');
            for (const btn of buttons) {
                const text = btn.innerText || '';
                const aria = btn.getAttribute('aria-label') || '';
                if (text.includes('Apply') || aria.includes('Apply')) {
                    if (btn.tagName === 'A') {
                        data.appLink = btn.href;
                        break;
                    }
                    const parentLink = btn.closest('a');
                    if (parentLink) {
                        data.appLink = parentLink.href;
                        break;
                    }
                }
            }
        }
    }

    _scrapeSingleJobPage(data) {
        const S = LINKEDIN_SELECTORS.single;

        // Title
        const titleEl = this._queryFirst(S.title);
        if (titleEl) data.position = titleEl.innerText.trim();

        // Company — try direct selectors first
        let companyEl = this._queryFirst(S.company);

        // Fallback: aria-label
        if (!companyEl) {
            const companyAria = document.querySelector(S.companyAria);
            if (companyAria) {
                companyEl = companyAria.tagName === 'A' ? companyAria : companyAria.closest('a');
                if (!companyEl) companyEl = companyAria;
            }
        }

        // Fallback: company link within top section
        if (!companyEl) {
            const topSection = this._queryFirst(S.companyTopSection) || document.body;
            companyEl = topSection.querySelector(S.companyLink);
        }

        if (companyEl) {
            let text = companyEl.innerText.trim();
            if (!text && companyEl.getAttribute('aria-label')) {
                text = companyEl.getAttribute('aria-label').replace('Company, ', '').replace('.', '');
            }
            data.company = text;

            if (companyEl.tagName === 'A') {
                data.companyUrl = companyEl.href.split('?')[0];
            } else {
                const parentLink = companyEl.closest('a');
                if (parentLink) data.companyUrl = parentLink.href.split('?')[0];
            }
        }

        // Description — try all selectors globally
        const descEl = this._queryFirst(S.description);
        if (descEl) {
            const { text, blocks } = extractJobDescription(descEl);
            data.description = text;
            data.descriptionBlocks = blocks;
        }
    }

    _scrapeDirectApplyLink(data) {
        const applyBtn = document.querySelector(LINKEDIN_SELECTORS.directApply);
        if (applyBtn) {
            const url = new URL(applyBtn.href);
            if (url.hostname === 'www.linkedin.com' && url.pathname.includes('/redirect')) {
                const target = url.searchParams.get('url');
                if (target) data.appLink = target;
            } else {
                data.appLink = applyBtn.href;
            }
        }
    }

    _scrapeLDJson(data) {
        if (!data.appLink) {
            try {
                const scripts = document.querySelectorAll(LINKEDIN_SELECTORS.ldJson);
                for (const script of scripts) {
                    try {
                        const json = JSON.parse(script.innerText);
                        const job = Array.isArray(json)
                            ? json.find(j => j['@type'] === 'JobPosting')
                            : (json['@type'] === 'JobPosting' ? json : null);

                        if (job) {
                            if (job.url) { data.appLink = job.url; break; }
                            if (job.applyUrl) { data.appLink = job.applyUrl; break; }
                        }
                    } catch (e) { /* ignore parse errors */ }
                }
            } catch (e) { console.log('Error parsing LD-JSON', e); }
        }
    }
}
