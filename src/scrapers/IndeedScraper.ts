/**
 * IndeedScraper — Handles job data extraction from Indeed job pages.
 */
import type { JobData } from '../types';
import { BaseScraper } from './BaseScraper';
import { INDEED_SELECTORS } from './selectors/indeed';
import { extractJobDescription, extractEmails } from '../utils/dom-utils';

export class IndeedScraper extends BaseScraper {
    getPlatformName(): string {
        return 'Indeed';
    }

    scrape(data: JobData): JobData {
        data.platform = this.getPlatformName();
        const S = INDEED_SELECTORS;

        // Clean URL
        const vjk = new URL(window.location.href).searchParams.get('vjk');
        if (vjk) {
            data.url = `https://www.indeed.com/viewjob?jk=${vjk}`;
        }

        // Title
        const titleEl = this._queryFirst(S.title) as HTMLElement | null;
        if (titleEl) data.position = titleEl.innerText.trim();

        // Company
        const companyEl = this._queryFirst(S.company) as HTMLElement | null;
        if (companyEl) data.company = companyEl.innerText.trim();

        // Salary
        const salaryEl = this._queryFirst(S.salary) as HTMLElement | null;
        if (salaryEl) data.salary = salaryEl.innerText.trim();

        // Description
        const descEl = this._queryFirst(S.description) as HTMLElement | null;
        if (descEl) {
            const { text, blocks } = extractJobDescription(descEl);
            data.description = text;
            data.descriptionBlocks = blocks;
        }

        // Apply Link
        const applyBtn = this._queryFirst(S.apply) as HTMLAnchorElement | null;
        if (applyBtn) data.appLink = applyBtn.href;

        // Extract email from description if available
        if (data.description) {
            const email = extractEmails(data.description);
            if (email) data.email = email;
        }

        return data;
    }
}
