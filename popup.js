document.addEventListener('DOMContentLoaded', initializePopup);

// DOM Elements
const form = document.getElementById('job-form');
const analyzeBtn = document.getElementById('analyzeBtn');
const saveBtn = document.getElementById('saveBtn');
const loadingDiv = document.getElementById('loading');
const contentDiv = document.getElementById('main-content');
const statusDiv = document.getElementById('status');

// ─── Session Cache Helpers ──────────────────────────────────────
// Cache TTL: 1 hour (results expire after this)
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Generates a cache key from a URL (strips query params for consistency).
 */
function getCacheKey(url) {
    try {
        const u = new URL(url);
        // For LinkedIn, keep currentJobId if present (it identifies the job)
        const jobId = u.searchParams.get('currentJobId');
        if (jobId) return `cache_linkedin_${jobId}`;
        // For Indeed, keep job key
        const vjk = u.searchParams.get('vjk');
        if (vjk) return `cache_indeed_${vjk}`;
        // Default: use origin + pathname
        return `cache_${u.origin}${u.pathname}`;
    } catch {
        return `cache_${url}`;
    }
}

/**
 * Saves data to session storage with a timestamp.
 */
async function setCache(key, data) {
    try {
        const entry = { data, timestamp: Date.now() };
        await chrome.storage.session.set({ [key]: entry });
    } catch (e) {
        console.warn('Cache write failed:', e.message);
    }
}

/**
 * Retrieves cached data if it exists and hasn't expired.
 * Returns null if cache miss or expired.
 */
async function getCache(key) {
    try {
        const result = await chrome.storage.session.get(key);
        const entry = result[key];
        if (!entry) return null;

        // Check TTL
        if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
            // Expired — clean up
            await chrome.storage.session.remove(key);
            return null;
        }
        return entry.data;
    } catch (e) {
        console.warn('Cache read failed:', e.message);
        return null;
    }
}

// ─── Main Initialization ────────────────────────────────────────
async function initializePopup() {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if we are on a supported site
    if (tab.url.includes('linkedin.com') || tab.url.includes('indeed.com')) {
        const cacheKey = getCacheKey(tab.url);

        // Check cache first
        const cached = await getCache(cacheKey);
        if (cached) {
            // Restore from cache — instant popup
            populateForm(cached.scraped);
            if (cached.analysis) {
                restoreAnalysis(cached.analysis);
            }
            showStatus('Restored from cache', 'success');
        } else {
            // No cache — scrape fresh
            await scrapeAndCache(tab, cacheKey);
        }
    } else {
        showError('This site is not supported. Navigate to LinkedIn or Indeed.');
    }

    // Bind buttons
    analyzeBtn.addEventListener('click', runAIAnalysis);
    form.addEventListener('submit', saveToNotion);
}

/**
 * Scrapes data from the content script and caches it.
 */
async function scrapeAndCache(tab, cacheKey) {
    try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_JOB' });
        if (response) {
            populateForm(response);
            await setCache(cacheKey, { scraped: response });
        } else {
            showError('Could not scrape page. Try refreshing.');
            console.log("No response from content script");
        }
    } catch (error) {
        console.warn('Initial connection to content script failed. Attempting to inject...', error.message);
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: [
                    'utils/dom-utils.js',
                    'scrapers/selectors/linkedin.js',
                    'scrapers/selectors/indeed.js',
                    'scrapers/BaseScraper.js',
                    'scrapers/LinkedInScraper.js',
                    'scrapers/IndeedScraper.js',
                    'content.js'
                ]
            });
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_JOB' });
            if (response) {
                populateForm(response);
                await setCache(cacheKey, { scraped: response });
            }
        } catch (e) {
            showError('Please refresh the page and try again.');
        }
    }
}

// ─── Form Population ────────────────────────────────────────────
function populateForm(data) {
    loadingDiv.classList.add('hidden');
    contentDiv.classList.remove('hidden');

    if (document.getElementById('company')) document.getElementById('company').value = data.company || '';
    if (document.getElementById('position')) document.getElementById('position').value = data.position || '';
    if (document.getElementById('platform')) document.getElementById('platform').value = data.platform || 'Other';

    if (data.salary) document.getElementById('salary').value = data.salary;

    // Email (extracted from JD via regex during scraping)
    if (data.email) document.getElementById('email').value = data.email;

    document.getElementById('link').value = data.url;

    if (data.appLink) document.getElementById('appLink').value = data.appLink;
    if (data.companyUrl) document.getElementById('companyUrl').value = data.companyUrl;
    if (data.description) document.getElementById('fullDescription').value = data.description;

    if (data.descriptionBlocks) {
        window.jobDescriptionBlocks = data.descriptionBlocks;
    }
}

/**
 * Restores AI analysis results from cache into the form.
 */
function restoreAnalysis(analysis) {
    if (analysis.email) document.getElementById('email').value = analysis.email;
    if (analysis.score != null) document.getElementById('scoreDisplay').textContent = analysis.score + '/100';
    if (analysis.summary) document.getElementById('aiAnalysis').value = analysis.summary;
}

// ─── AI Analysis ────────────────────────────────────────────────
async function runAIAnalysis() {
    const description = document.getElementById('fullDescription').value;
    if (!description) {
        showStatus('No job description found to analyze.', 'error');
        return;
    }

    analyzeBtn.textContent = 'Analyzing...';
    analyzeBtn.disabled = true;

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'ANALYZE_JOB',
            description: description
        });

        if (response && response.success) {
            const analysis = {
                email: response.data.email || '',
                score: response.data.score,
                summary: response.data.summary || ''
            };

            document.getElementById('email').value = analysis.email;
            document.getElementById('scoreDisplay').textContent = analysis.score + '/100';
            document.getElementById('aiAnalysis').value = analysis.summary;
            showStatus('Analysis complete!', 'success');

            // Cache the analysis results alongside the scraped data
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const cacheKey = getCacheKey(tab.url);
            const existing = await getCache(cacheKey);
            await setCache(cacheKey, {
                scraped: existing ? existing.scraped : null,
                analysis: analysis
            });

        } else {
            showStatus('AI Analysis failed: ' + (response.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        showStatus('AI Error: ' + error.message, 'error');
    } finally {
        analyzeBtn.textContent = '✨ Run AI Analysis';
        analyzeBtn.disabled = false;
    }
}

// ─── Save to Notion ─────────────────────────────────────────────
async function saveToNotion(e) {
    e.preventDefault();

    const formData = {
        company: document.getElementById('company').value,
        position: document.getElementById('position').value,
        platform: document.getElementById('platform').value,
        status: document.getElementById('statusSelect').value,
        salary: document.getElementById('salary').value,
        link: document.getElementById('link').value,
        appLink: document.getElementById('appLink').value,
        companyUrl: document.getElementById('companyUrl').value,
        email: document.getElementById('email').value,
        score: document.getElementById('scoreDisplay').textContent.replace('/100', '').replace('--', '0'),
        description: document.getElementById('fullDescription').value,
        descriptionBlocks: window.jobDescriptionBlocks || [],
        summary: document.getElementById('aiAnalysis').value
    };

    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'SAVE_TO_NOTION',
            data: formData
        });

        if (response && response.success) {
            // Clear cache for this job after successful save
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const cacheKey = getCacheKey(tab.url);
            await chrome.storage.session.remove(cacheKey);

            showStatus('Saved to Notion!', 'success');
            setTimeout(() => window.close(), 1500);
        } else {
            showStatus('Save failed: ' + (response.error || 'Unknown error'), 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save to Notion';
        }
    } catch (error) {
        showStatus('Save Error: ' + error.message, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save to Notion';
    }
}

// ─── UI Helpers ─────────────────────────────────────────────────
function showStatus(msg, type) {
    statusDiv.textContent = msg;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 4000);
}

function showError(msg) {
    loadingDiv.textContent = msg;
    loadingDiv.style.color = 'var(--error-color)';
}
