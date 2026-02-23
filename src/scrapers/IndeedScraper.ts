/**
 * IndeedScraper — Handles job data extraction from Indeed job pages.
 */
import type { JobData, RemoteConfig } from '../types';
import { BaseScraper } from './BaseScraper';
import fallbackConfigData from '../config/selectors.json';
import { extractJobDescription, extractEmails } from '../utils/dom-utils';

export class IndeedScraper extends BaseScraper {
    getPlatformName(): string {
        return 'Indeed';
    }

    scrape(data: JobData, config?: RemoteConfig): JobData {
        data.platform = this.getPlatformName();
        // Use over-the-air dynamic selectors if available, fallback to bundled defaults
        const fallback = fallbackConfigData as unknown as RemoteConfig;
        const S = config?.indeed || fallback.indeed;

        // Clean URL
        const vjk = new URL(window.location.href).searchParams.get('vjk');
        if (vjk) {
            data.url = `https://www.indeed.com/viewjob?jk=${vjk}`;
        }

        // Title
        const titleEl = this._queryFirst(S.position) as HTMLElement | null;
        if (titleEl) data.position = titleEl.innerText.trim();

        // Company
        const companyEl = this._queryFirst(S.company) as HTMLElement | null;
        if (companyEl) data.company = companyEl.innerText.trim();

        // Company URL
        const companyUrlEl = this._queryFirst(S.companyUrl) as HTMLAnchorElement | null;
        if (companyUrlEl) data.companyUrl = companyUrlEl.href;

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
        const applyBtn = this._queryFirst(S.appLink) as HTMLAnchorElement | null;
        if (applyBtn) data.appLink = applyBtn.href;

        // Extract email from description if available
        if (data.description) {
            const email = extractEmails(data.description);
            if (email) data.email = email;
        }

        return data;
    }
}
