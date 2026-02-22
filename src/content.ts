/**
 * Content Script Entry Point — Factory/Context
 *
 * Detects the current page URL, instantiates the correct scraper,
 * and runs it when the popup sends a SCRAPE_JOB message.
 */
import type { JobData } from './types';
import { BaseScraper } from './scrapers/BaseScraper';
import { LinkedInScraper } from './scrapers/LinkedInScraper';
import { IndeedScraper } from './scrapers/IndeedScraper';

/**
 * Returns the appropriate scraper for the current URL, or null if unsupported.
 */
function getScraperForUrl(url: string): BaseScraper | null {
    if (url.includes('linkedin.com')) return new LinkedInScraper();
    if (url.includes('indeed.com')) return new IndeedScraper();
    return null;
}

/**
 * Scrapes job data from the current page using the appropriate strategy.
 */
function scrapeJobData(): JobData {
    const url = window.location.href;
    const data: JobData = {
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
        return scraper.scrape(data);
    }

    return data;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'SCRAPE_JOB') {
        const data = scrapeJobData();
        sendResponse(data);
    }
    return true;
});
