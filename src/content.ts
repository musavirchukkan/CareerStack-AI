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
import { sanitizeText } from './utils/dom-utils';

/**
 * Returns the appropriate scraper for the current URL, or null if unsupported.
 */
function getScraperForUrl(url: string): BaseScraper | null {
    const isLinkedInJob = url.includes('linkedin.com/jobs/') || url.includes('linkedin.com/jobs/view/');
    const isIndeedJob = url.includes('indeed.com/viewjob') || url.includes('indeed.com/jobs');

    if (isLinkedInJob) return new LinkedInScraper();
    if (isIndeedJob) return new IndeedScraper();
    return null;
}

/**
 * Scrapes job data from the current page using the appropriate strategy.
 */
function scrapeJobData(): JobData {
    const url = window.location.href;
    const data: JobData = {
        url: sanitizeText(url),
        platform: 'Other',
        company: '',
        position: '',
        salary: '',
        description: '',
        appLink: ''
    };

    const scraper = getScraperForUrl(url);
    if (scraper) {
        try {
            const result = scraper.scrape(data);
            result.company = sanitizeText(result.company);
            result.position = sanitizeText(result.position);
            result.salary = sanitizeText(result.salary);
            result.description = sanitizeText(result.description);
            result.appLink = sanitizeText(result.appLink);
            if (result.companyUrl) result.companyUrl = sanitizeText(result.companyUrl);
            
            const missing = [];
            if (!result.company) missing.push('Company');
            if (!result.position) missing.push('Position');
            if (!result.description) missing.push('Description');
            
            if (missing.length > 0) {
                result.warnings = [`Missing fields: ${missing.join(', ')}`];
            }
            return result;
        } catch (error) {
            console.error('Scraping error:', error);
            data.warnings = ['A critical error occurred while scraping. Some fields may be missing.'];
            return data;
        }
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
