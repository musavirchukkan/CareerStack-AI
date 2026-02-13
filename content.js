chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SCRAPE_JOB') {
        const data = scrapeJobData();
        sendResponse(data);
    }
    return true;
});

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

    if (url.includes('linkedin.com')) {
        data = scrapeLinkedIn(data);
    } else if (url.includes('indeed.com')) {
        data = scrapeIndeed(data);
    }

    return data;
}

function scrapeLinkedIn(data) {
    data.platform = 'LinkedIn';

    // URL Cleaning
    // If we are on a search page with a currentJobId, construct clean view URL
    const urlObj = new URL(window.location.href);
    const currentJobId = urlObj.searchParams.get('currentJobId');
    if (currentJobId) {
        data.url = `https://www.linkedin.com/jobs/view/${currentJobId}/`;
    } else {
        // Clean up view URLs by removing query params
        data.url = window.location.origin + window.location.pathname;
    }

    // Strategy 1: Job Collections / Search Page (Right Rail)
    // Look for the active job card or detail container
    const detailContainer = document.querySelector('.jobs-search__right-rail') ||
        document.querySelector('.jobs-details__main-content');

    if (detailContainer) {
        // Title
        const titleEl = detailContainer.querySelector('.job-details-jobs-unified-top-card__job-title') ||
            detailContainer.querySelector('h2.t-24');
        if (titleEl) data.position = titleEl.innerText.trim();

        // Company
        const companyEl = detailContainer.querySelector('.job-details-jobs-unified-top-card__company-name') ||
            detailContainer.querySelector('.jobs-unified-top-card__company-name');
        if (companyEl) data.company = companyEl.innerText.trim();

        // Salary (often distinct)
        const salaryEl = detailContainer.querySelector('.jobs-unified-top-card__salary-info'); // Example selector
        if (salaryEl) data.salary = salaryEl.innerText.trim();

        // Description - PRESERVE FORMATTING
        const descEl = detailContainer.querySelector('#job-details') ||
            document.querySelector('.jobs-description-content__text');
        if (descEl) {
            // Get text content but preserve newlines
            // We use innerText which usually preserves visible newlines, unlike textContent
            data.description = descEl.innerText.trim();
        }

        // Apply Link
        // "Easy Apply" usually means internal. External apply is a simple link.
        const applyBtn = detailContainer.querySelector('.jobs-apply-button--top-card button');
        if (applyBtn) {
            // If it's a link styled as button
            const link = applyBtn.closest('a');
            if (link) data.appLink = link.href;
        }
    }

    // Strategy 2: Single Job Page (Full View)
    else {
        const titleEl = document.querySelector('h1.top-card-layout__title');
        if (titleEl) data.position = titleEl.innerText.trim();

        const companyEl = document.querySelector('.top-card-layout__first-subline .topcard__org-name-link');
        if (companyEl) data.company = companyEl.innerText.trim();

        const descEl = document.querySelector('.show-more-less-html__markup');
        if (descEl) {
            data.description = descEl.innerText.trim();
        }
    }

    // Fallback cleanup
    if (!data.position) data.position = document.title.split('|')[0].trim();

    return data;
}

function scrapeIndeed(data) {
    data.platform = 'Indeed';

    // Clean URL
    const vjk = new URL(window.location.href).searchParams.get('vjk');
    if (vjk) {
        data.url = `https://www.indeed.com/viewjob?jk=${vjk}`;
    }

    // Indeed often uses an iframe for the vjs container, but sometimes it is inline.
    // We need to target the jobDetailPane if present.

    const titleEl = document.querySelector('.jobsearch-JobInfoHeader-title');
    if (titleEl) data.position = titleEl.innerText.trim();

    const companyEl = document.querySelector('[data-company-name="true"]');
    if (companyEl) data.company = companyEl.innerText.trim();

    const salaryEl = document.querySelector('#salaryInfoAndJobType');
    if (salaryEl) data.salary = salaryEl.innerText.trim();

    const descEl = document.querySelector('#jobDescriptionText');
    if (descEl) {
        data.description = descEl.innerText.trim();
    }

    // Apply Link
    const applyBtn = document.querySelector('#applyButtonLinkContainer a');
    if (applyBtn) data.appLink = applyBtn.href;

    return data;
}
