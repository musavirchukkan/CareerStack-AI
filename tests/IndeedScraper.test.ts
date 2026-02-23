import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { IndeedScraper } from '../src/scrapers/IndeedScraper';
import type { JobData, RemoteConfig } from '../src/types';

describe('IndeedScraper', () => {
  let scraper: IndeedScraper;

  beforeAll(() => {
    // JSDOM does not implement innerText, so we polyfill it for testing
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      get() {
        return this.textContent || '';
      },
    });
  });

  beforeEach(() => {
    scraper = new IndeedScraper();
    document.body.innerHTML = ''; // reset DOM
  });

  it('returns platform Indeed', () => {
    expect(scraper.getPlatformName()).toBe('Indeed');
  });

  it('scrapes correctly using fallback selectors', () => {
    // Mock DOM matching the bundled INDEED_SELECTORS
    document.body.innerHTML = `
            <div class="jobsearch-JobInfoHeader-title">Software Engineer</div>
            <span data-company-name="true">Tech Corp</span>
            <div id="salaryInfoAndJobType">$100,000</div>
            <div id="jobDescriptionText">We are looking for a dev.</div>
            <div id="applyButtonLinkContainer"><a href="https://apply.techcorp.com">Apply Here</a></div>
        `;

    const data: JobData = {
      url: '',
      platform: '',
      company: '',
      position: '',
      salary: '',
      description: '',
      appLink: '',
    };
    const result = scraper.scrape(data);

    expect(result.position).toBe('Software Engineer');
    expect(result.company).toBe('Tech Corp');
    expect(result.salary).toBe('$100,000');
    expect(result.description).toContain('dev');
    expect(result.appLink).toBe('https://apply.techcorp.com/');
  });

  it('respects dynamic config overrides and bypasses fallbacks', () => {
    // Mock DOM mapping to completely DIFFERENT selectors that the bundled ones wouldn't find
    document.body.innerHTML = `
            <h1 class="my-custom-title-class">Senior Developer</h1>
            <div class="my-custom-company-class">Startup Inc</div>
            <a class="my-custom-company-link" href="https://startup.com">Website</a>
            <span class="my-custom-salary">$150,000</span>
            <article class="my-custom-description">Looking for a Senior Dev</article>
            <a class="my-custom-apply-btn" href="https://apply.startup.com">Apply Now</a>
        `;

    // Define a mock dynamic RemoteConfig
    const mockConfig: RemoteConfig = {
      version: '1.0.1',
      linkedin: {
        position: [],
        company: [],
        companyUrl: [],
        salary: [],
        description: [],
        appLink: [],
      },
      indeed: {
        position: ['.my-custom-title-class'],
        company: ['.my-custom-company-class'],
        companyUrl: ['.my-custom-company-link'],
        salary: ['.my-custom-salary'],
        description: ['.my-custom-description'],
        appLink: ['.my-custom-apply-btn'],
      },
    };

    const data: JobData = {
      url: '',
      platform: '',
      company: '',
      position: '',
      salary: '',
      description: '',
      appLink: '',
    };

    // Pass the dynamic config into the scraper
    const result = scraper.scrape(data, mockConfig);

    // It should successfully pull data using ONLY the dynamic config selectors
    expect(result.position).toBe('Senior Developer');
    expect(result.company).toBe('Startup Inc');
    expect(result.companyUrl).toBe('https://startup.com/');
    expect(result.salary).toBe('$150,000');
    expect(result.description).toContain('Senior Dev');
    expect(result.appLink).toBe('https://apply.startup.com/');
  });
});
