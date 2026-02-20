/**
 * BaseScraper — Abstract base class for job page scrapers.
 * All platform-specific scrapers must extend this class.
 *
 * Loaded as a classic content script — class is available in global scope.
 */
class BaseScraper {
    constructor() {
        if (new.target === BaseScraper) {
            throw new Error('BaseScraper is abstract and cannot be instantiated directly.');
        }
    }

    /**
     * Returns the platform name (e.g. 'LinkedIn', 'Indeed').
     * @returns {string}
     */
    getPlatformName() {
        throw new Error('getPlatformName() must be implemented by subclass.');
    }

    /**
     * Scrapes job data from the current page.
     * @param {object} data - The base data object with default fields.
     * @returns {object} - The populated data object.
     */
    scrape(data) {
        throw new Error('scrape() must be implemented by subclass.');
    }

    /**
     * Tries an array of CSS selectors in order and returns the first matching element.
     * Useful for gracefully handling DOM changes across site versions.
     *
     * @param {string[]} selectors - Array of CSS selectors to try in order.
     * @param {Element|Document} [context=document] - The root element to query within.
     * @returns {Element|null}
     */
    _queryFirst(selectors, context) {
        const root = context || document;
        for (const selector of selectors) {
            const el = root.querySelector(selector);
            if (el) return el;
        }
        return null;
    }
}
