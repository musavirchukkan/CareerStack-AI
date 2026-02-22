/**
 * BaseScraper — Abstract base class for job page scrapers.
 * All platform-specific scrapers must extend this class.
 */
import type { JobData, SelectorList } from '../types';

export abstract class BaseScraper {
    /**
     * Returns the platform name (e.g. 'LinkedIn', 'Indeed').
     */
    abstract getPlatformName(): string;

    /**
     * Scrapes job data from the current page.
     */
    abstract scrape(data: JobData): JobData;

    /**
     * Tries an array of CSS selectors in order and returns the first matching element.
     * Useful for gracefully handling DOM changes across site versions.
     */
    protected _queryFirst(selectors: SelectorList, context?: Element | Document): Element | null {
        const root = context || document;
        for (const selector of selectors) {
            const el = root.querySelector(selector);
            if (el) return el;
        }
        return null;
    }
}
