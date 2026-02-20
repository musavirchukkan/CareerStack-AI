/**
 * IndeedScraper — Handles job data extraction from Indeed job pages.
 *
 * Depends on: BaseScraper, INDEED_SELECTORS, extractJobDescription
 * Loaded as a classic content script.
 */
class IndeedScraper extends BaseScraper {
    getPlatformName() {
        return 'Indeed';
    }

    scrape(data) {
        data.platform = this.getPlatformName();
        const S = INDEED_SELECTORS;

        // Clean URL
        const vjk = new URL(window.location.href).searchParams.get('vjk');
        if (vjk) {
            data.url = `https://www.indeed.com/viewjob?jk=${vjk}`;
        }

        // Title
        const titleEl = this._queryFirst(S.title);
        if (titleEl) data.position = titleEl.innerText.trim();

        // Company
        const companyEl = this._queryFirst(S.company);
        if (companyEl) data.company = companyEl.innerText.trim();

        // Salary
        const salaryEl = this._queryFirst(S.salary);
        if (salaryEl) data.salary = salaryEl.innerText.trim();

        // Description
        const descEl = this._queryFirst(S.description);
        if (descEl) {
            const { text, blocks } = extractJobDescription(descEl);
            data.description = text;
            data.descriptionBlocks = blocks;
        }

        // Apply Link
        const applyBtn = this._queryFirst(S.apply);
        if (applyBtn) data.appLink = applyBtn.href;

        // Extract email from description if available
        if (data.description) {
            const email = extractEmails(data.description);
            if (email) data.email = email;
        }

        return data;
    }
}
