/**
 * LinkedInScraper — Handles job data extraction from LinkedIn job pages.
 * Supports both search/collections pages (right rail) and single job view pages.
 */
import type { JobData, RemoteConfig } from '../types';
import { BaseScraper } from './BaseScraper';
import fallbackConfigData from '../config/selectors.json';
import { extractJobDescription, extractEmails } from '../utils/dom-utils';

export class LinkedInScraper extends BaseScraper {
    getPlatformName(): string {
        return 'LinkedIn';
    }

    scrape(data: JobData, config?: RemoteConfig): JobData {
        data.platform = this.getPlatformName();
        const fallback = fallbackConfigData as unknown as RemoteConfig;
        const dynamicSelectors = config?.linkedin || fallback.linkedin;

        // URL Cleaning
        const urlObj = new URL(window.location.href);
        const currentJobId = urlObj.searchParams.get('currentJobId');
        if (currentJobId) {
            data.url = `https://www.linkedin.com/jobs/view/${currentJobId}/`;
        } else {
            data.url = window.location.origin + window.location.pathname;
        }

        // Strategy 1: Job Collections / Search Page (Right Rail)
        // Hardcoded container since we flattened the JSON to only hold fields, this container rarely changes
        const detailContainer = this._queryFirst([".job-details-jobs-unified-top-card__container", ".job-view-layout"]);

        if (detailContainer) {
            this._scrapeDetailContainer(data, detailContainer, dynamicSelectors);
        }
        // Strategy 2: Single Job Page (Full View)
        else {
            this._scrapeSingleJobPage(data, dynamicSelectors);
        }

        // Apply Link (Direct Page — works for both strategies)
        this._scrapeDirectApplyLink(data, dynamicSelectors);

        // Last Resort: LD-JSON script tags
        this._scrapeLDJson(data);

        // Strategy 3: Extract from active job card in feed (collections/recommended pages)
        if (!data.position || !data.company) {
            this._scrapeFromJobCard(data);
        }

        // Final fallback: extract title from document.title
        if (!data.position) {
            const docTitle = document.title.split('|')[0].trim();
            if (docTitle && !docTitle.match(/^\(\d+\)/) && !docTitle.includes('job picks')) {
                data.position = docTitle.split(' - ')[0].trim();
            }
        }

        // Extract email from description if available
        if (data.description) {
            const email = extractEmails(data.description);
            if (email) data.email = email;
        }

        return data;
    }

    /**
     * Strategy 3: Extract title/company from the selected job card in the feed.
     * On /jobs/collections/ pages, the right panel may lack detectable containers,
     * but the left-side job cards contain the info, keyed by currentJobId.
     */
    private _scrapeFromJobCard(data: JobData): void {
        const urlObj = new URL(window.location.href);
        const currentJobId = urlObj.searchParams.get('currentJobId');
        if (!currentJobId) return;

        // Find the job card link for the currently selected job
        const cardLink = document.querySelector(`a[href*="currentJobId=${currentJobId}"]`);
        if (!cardLink) return;

        const card = cardLink.closest('[data-view-name="job-card"]') || cardLink;

        // Title: extract from dismiss button aria-label ("Dismiss <Title> job")
        if (!data.position) {
            const dismissBtn = card.querySelector('button[data-view-name="dismiss-job"]');
            if (dismissBtn) {
                const aria = dismissBtn.getAttribute('aria-label') || '';
                const match = aria.match(/^Dismiss\s+(.+?)\s+job$/i);
                if (match) data.position = match[1].trim();
            }
        }

        // Company: find <p> siblings of the bullet separator " • " in the card
        if (!data.company) {
            const allPs = card.querySelectorAll('p');
            for (const p of allPs) {
                if ((p as HTMLElement).innerText.trim() === '•') {
                    // Bullet separator found — company is the first <p> in same parent
                    const parent = p.parentElement;
                    if (parent) {
                        const firstP = parent.querySelector('p') as HTMLElement | null;
                        if (firstP && firstP.innerText.trim() !== '•') {
                            data.company = firstP.innerText.trim();
                        }
                    }
                    break;
                }
            }
        }
    }

    private _scrapeDetailContainer(data: JobData, detailContainer: Element, dynamicSelectors: RemoteConfig['linkedin']): void {
        // Title — try dynamic config first
        const titleSelectors = dynamicSelectors.position;
        const titleEl = this._queryFirst(titleSelectors, detailContainer) as HTMLElement | null;
        if (titleEl) data.position = titleEl.innerText.trim();

        // Company — try direct selectors first
        const companySelectors = dynamicSelectors.company;
        let companyEl = this._queryFirst(companySelectors, detailContainer);

        // Fallback: aria-label="Company, Xyz." (LinkedIn 2026 SDUI)
        if (!companyEl) {
            const ariaEl = detailContainer.querySelector('[aria-label^="Company, "]');
            if (ariaEl) {
                const ariaVal = ariaEl.getAttribute('aria-label') || '';
                const match = ariaVal.match(/^Company,\s*(.+?)\.?$/);
                if (match) data.company = match[1].trim();

                // Get company URL from link within or nearby
                const link = ariaEl.querySelector('a[href*="/company/"]') ||
                             ariaEl.closest('a[href*="/company/"]');
                if (link) data.companyUrl = (link as HTMLAnchorElement).href.split('?')[0];

                companyEl = ariaEl; // mark as found
            }
        }

        if (companyEl && !data.company) {
            data.company = (companyEl as HTMLElement).innerText.trim();
            const link = companyEl.tagName === 'A' ? companyEl : companyEl.querySelector('a');
            if (link) {
                data.companyUrl = (link as HTMLAnchorElement).href.split('?')[0];
            }
        }

        // Salary
        const salarySelectors = dynamicSelectors.salary;
        const salaryEl = this._queryFirst(salarySelectors, detailContainer) as HTMLElement | null;
        if (salaryEl) data.salary = salaryEl.innerText.trim();

        // Description — try within container first, then globally
        const descSelectors = dynamicSelectors.description;
        let descEl = this._queryFirst(descSelectors, detailContainer) as HTMLElement | null;
        if (!descEl) descEl = this._queryFirst(descSelectors) as HTMLElement | null;
        if (descEl) {
            const { text, blocks } = extractJobDescription(descEl);
            data.description = text;
            data.descriptionBlocks = blocks;
        }

        // Apply Link — try dynamic config selectors first
        const applySelectors = dynamicSelectors.appLink;
        for (const selector of applySelectors) {
            const el = detailContainer.querySelector(selector);
            if (el) {
                if (el.tagName === 'A') {
                    data.appLink = (el as HTMLAnchorElement).href;
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
            const topCard = detailContainer;

            const buttons = topCard.querySelectorAll('button, a');
            for (const btn of buttons) {
                const text = (btn as HTMLElement).innerText || '';
                const aria = btn.getAttribute('aria-label') || '';
                if (text.includes('Apply') || aria.includes('Apply')) {
                    if (btn.tagName === 'A') {
                        data.appLink = (btn as HTMLAnchorElement).href;
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

    private _scrapeSingleJobPage(data: JobData, dynamicSelectors: RemoteConfig['linkedin']): void {
        // Title
        const titleSelectors = dynamicSelectors.position;
        const titleEl = this._queryFirst(titleSelectors) as HTMLElement | null;
        if (titleEl) data.position = titleEl.innerText.trim();

        // Company — try dynamic config selectors first
        const companySelectors = dynamicSelectors.company;
        let companyEl = this._queryFirst(companySelectors);

        // Fallback: aria-label
        if (!companyEl) {
            const companyAria = document.querySelector('[aria-label^="Company, "]');
            if (companyAria) {
                companyEl = companyAria.tagName === 'A' ? companyAria : companyAria.closest('a');
                if (!companyEl) companyEl = companyAria;
            }
        }

        // Fallback: company link within top section
        if (!companyEl) {
            const topSection = this._queryFirst(['.top-card-layout']) || document.body;
            companyEl = topSection.querySelector('a[href*="/company/"]');
        }

        if (companyEl) {
            let text = (companyEl as HTMLElement).innerText.trim();
            if (!text && companyEl.getAttribute('aria-label')) {
                text = (companyEl.getAttribute('aria-label') || '').replace('Company, ', '').replace('.', '');
            }
            data.company = text;

            if (companyEl.tagName === 'A') {
                data.companyUrl = (companyEl as HTMLAnchorElement).href.split('?')[0];
            } else {
                const parentLink = companyEl.closest('a');
                if (parentLink) data.companyUrl = parentLink.href.split('?')[0];
            }
        }

        // Description — try all selectors globally
        const descSelectors = dynamicSelectors.description;
        const descEl = this._queryFirst(descSelectors) as HTMLElement | null;
        if (descEl) {
            const { text, blocks } = extractJobDescription(descEl);
            data.description = text;
            data.descriptionBlocks = blocks;
        }
    }

    private _scrapeDirectApplyLink(data: JobData, dynamicSelectors: RemoteConfig['linkedin']): void {
        // Look at dynamic config + static specific directApply 
        const applySelectors = [...dynamicSelectors.appLink, 'a[aria-label^="Apply on company website"]'];
        const applyBtn = this._queryFirst(applySelectors) as HTMLAnchorElement | null;
        
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

    private _scrapeLDJson(data: JobData): void {
        if (!data.appLink) {
            try {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                for (const script of scripts) {
                    try {
                        const json = JSON.parse((script as HTMLElement).innerText);
                        const job = Array.isArray(json)
                            ? json.find((j: Record<string, unknown>) => j['@type'] === 'JobPosting')
                            : (json['@type'] === 'JobPosting' ? json : null);

                        if (job) {
                            if (job.url) { data.appLink = job.url; break; }
                            if (job.applyUrl) { data.appLink = job.applyUrl; break; }
                        }
                    } catch { /* ignore parse errors */ }
                }
            } catch (e) { console.log('Error parsing LD-JSON', e); }
        }
    }
}
