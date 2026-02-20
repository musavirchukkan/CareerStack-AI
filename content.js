/**
 * Content Script Entry Point — Factory/Context
 *
 * Detects the current page URL, instantiates the correct scraper,
 * and runs it when the popup sends a SCRAPE_JOB message.
 *
 * Depends on: BaseScraper, LinkedInScraper, IndeedScraper (loaded before this file via manifest)
 */

/**
 * Returns the appropriate scraper for the current URL, or null if unsupported.
 * @param {string} url
 * @returns {BaseScraper|null}
 */
function getScraperForUrl(url) {
    if (url.includes('linkedin.com')) return new LinkedInScraper();
    if (url.includes('indeed.com')) return new IndeedScraper();
    return null;
}

/**
 * Scrapes job data from the current page using the appropriate strategy.
 * @returns {object}
 */
function scrapeJobData() {
    const url = window.location.href;
    let data = {
        url: url,
        platform: 'Other',
        company: '',
        position: '',
        salary: '',
        description: '',
        appLink: ''
    };

    const scraper = getScraperForUrl(url);
    if (scraper) {
        data = scraper.scrape(data);
    }

    return data;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SCRAPE_JOB') {
        const data = scrapeJobData();
        sendResponse(data);
    }
    return true;
});
