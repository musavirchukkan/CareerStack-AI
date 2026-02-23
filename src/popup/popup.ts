/**
 * Popup Script — Main UI logic for the CareerStack extension popup.
 */
import type { JobData, AIAnalysisData, DescriptionBlock } from '../types';

// Extend Window to store description blocks
declare global {
  interface Window {
    jobDescriptionBlocks?: DescriptionBlock[];
  }
}

document.addEventListener('DOMContentLoaded', initializePopup);

// DOM Elements
const form = document.getElementById('job-form') as HTMLFormElement;
const analyzeBtn = document.getElementById('analyzeBtn') as HTMLButtonElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const loadingDiv = document.getElementById('loading') as HTMLDivElement;
const contentDiv = document.getElementById('main-content') as HTMLDivElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;
const unsupportedDiv = document.getElementById('unsupported-state') as HTMLDivElement;
const skeletonContainer = document.getElementById('skeleton-container') as HTMLDivElement;
const errorMessageDiv = document.getElementById('error-message') as HTMLDivElement;
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;

// Operation locks — prevent double-clicks and spam
let isAnalyzing = false;
let isSaving = false;
const COOLDOWN_MS = 2000; // Minimum time between button re-enables

// ─── Session Cache Helpers ──────────────────────────────────────
// Cache TTL: 1 hour (results expire after this)
const CACHE_TTL_MS = 60 * 60 * 1000;

interface CacheEntry {
  scraped: JobData | null;
  analysis?: AIAnalysisData;
}

interface CacheRecord {
  data: CacheEntry;
  timestamp: number;
}

/**
 * Generates a cache key from a URL (strips query params for consistency).
 */
function getCacheKey(url: string): string {
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
async function setCache(key: string, data: CacheEntry): Promise<void> {
  try {
    const entry: CacheRecord = { data, timestamp: Date.now() };
    await chrome.storage.session.set({ [key]: entry });
  } catch (e) {
    console.warn('Cache write failed:', (e as Error).message);
  }
}

/**
 * Retrieves cached data if it exists and hasn't expired.
 * Returns null if cache miss or expired.
 */
async function getCache(key: string): Promise<CacheEntry | null> {
  try {
    const result = await chrome.storage.session.get(key);
    const entry = result[key] as CacheRecord | undefined;
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      // Expired — clean up
      await chrome.storage.session.remove(key);
      return null;
    }
    return entry.data;
  } catch (e) {
    console.warn('Cache read failed:', (e as Error).message);
    return null;
  }
}

// ─── Main Initialization ────────────────────────────────────────
async function initializePopup(): Promise<void> {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check if we are on a supported site
  const isLinkedIn =
    tab.url?.includes('linkedin.com/jobs/') || tab.url?.includes('linkedin.com/jobs/view/');
  const isIndeed = tab.url?.includes('indeed.com/viewjob') || tab.url?.includes('indeed.com/jobs');

  if (isLinkedIn || isIndeed) {
    const cacheKey = getCacheKey(tab.url!);

    // Check cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      // Restore from cache — instant popup
      if (cached.scraped) populateForm(cached.scraped);
      if (cached.analysis) {
        restoreAnalysis(cached.analysis);
      }
      showStatus('Restored from cache', 'success');
    } else {
      // No cache — scrape fresh
      await scrapeAndCache(tab, cacheKey);
    }
  } else {
    showUnsupported();
  }

  // Bind buttons
  analyzeBtn.addEventListener('click', runAIAnalysis);
  form.addEventListener('submit', saveToNotion);
  settingsBtn?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('clearCacheBtn')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const cacheKey = getCacheKey(tab.url!);
    await chrome.storage.session.remove(cacheKey);
    showStatus('Cache cleared! Rescraping...', 'success');
    // Reset form and rescrape
    loadingDiv.classList.remove('hidden');
    contentDiv.classList.add('hidden');
    await scrapeAndCache(tab, cacheKey);
  });
}

/**
 * Scrapes data from the content script and caches it.
 */
async function scrapeAndCache(tab: chrome.tabs.Tab, cacheKey: string): Promise<void> {
  if (!tab.id) {
    showError('Invalid tab. Try refreshing.');
    return;
  }

  try {
    const response = (await chrome.tabs
      .sendMessage(tab.id, { action: 'SCRAPE_JOB' })
      .catch((err) => {
        console.warn('Initial scrape failed (content script may not be loaded):', err.message);
        return { error: err.message };
      })) as JobData | { error: string } | undefined;

    if (response && !('error' in response)) {
      populateForm(response as JobData);
      await setCache(cacheKey, { scraped: response as JobData });
    } else {
      // First attempt failed (no content script or actual error). Attempt to inject it.
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });
        const retryResponse = (await chrome.tabs
          .sendMessage(tab.id, { action: 'SCRAPE_JOB' })
          .catch((err) => {
            console.error('Retry scrape failed:', err.message);
            return { error: err.message };
          })) as JobData | { error: string } | undefined;

        if (retryResponse && !('error' in retryResponse)) {
          populateForm(retryResponse as JobData);
          await setCache(cacheKey, { scraped: retryResponse as JobData });
        } else {
          const errMsg =
            retryResponse && 'error' in retryResponse ? retryResponse.error : 'Unknown error';
          showError(`Failed to scrape page: ${errMsg}. Try refreshing.`);
        }
      } catch (injectError) {
        console.error('Script injection failed:', injectError);
        showUnsupported();
      }
    }
  } catch {
    showError('An unexpected error occurred. Try refreshing.');
  }
}

// ─── Form Population ────────────────────────────────────────────
function populateForm(data: JobData): void {
  loadingDiv.classList.add('hidden');
  contentDiv.classList.remove('hidden');

  const setVal = (id: string, value: string): void => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.value = value;
  };

  setVal('company', data.company || '');
  setVal('position', data.position || '');
  setVal('platform', data.platform || 'Other');
  if (data.salary) setVal('salary', data.salary);

  const emailEl = document.getElementById('email') as HTMLInputElement;
  if (data.email) {
    if (emailEl) emailEl.value = data.email;
  } else {
    if (emailEl) emailEl.placeholder = 'No email found';
  }
  setVal('link', data.url);
  if (data.appLink) setVal('appLink', data.appLink);
  if (data.companyUrl) setVal('companyUrl', data.companyUrl);
  if (data.description) setVal('fullDescription', data.description);

  if (data.descriptionBlocks) {
    window.jobDescriptionBlocks = data.descriptionBlocks;
  }

  if (data.warnings && data.warnings.length > 0) {
    showStatusHTML(`⚠️ ${data.warnings.join('<br>')}`, 'error', 6000);
  }
}

/**
 * Restores AI analysis results from cache into the form.
 */
function restoreAnalysis(analysis: AIAnalysisData): void {
  const emailEl = document.getElementById('email') as HTMLInputElement;
  if (analysis.email) {
    if (emailEl) emailEl.value = analysis.email;
  } else {
    if (emailEl) emailEl.placeholder = 'No email found';
  }

  if (analysis.score != null)
    document.getElementById('scoreDisplay')!.textContent = analysis.score + '/100';
  if (analysis.summary)
    (document.getElementById('aiAnalysis') as HTMLTextAreaElement).value = analysis.summary;
}

// ─── AI Analysis ────────────────────────────────────────────────
async function runAIAnalysis(): Promise<void> {
  if (!navigator.onLine) {
    showStatus('You are offline. Check connection.', 'error');
    return;
  }

  if (isAnalyzing) return; // Prevent double-click
  isAnalyzing = true;

  const description = (document.getElementById('fullDescription') as HTMLInputElement).value;
  if (!description) {
    showStatus('No job description found to analyze.', 'error');
    isAnalyzing = false;
    return;
  }

  analyzeBtn.textContent = 'Analyzing...';
  analyzeBtn.disabled = true;

  try {
    const response = await chrome.runtime
      .sendMessage({
        action: 'ANALYZE_JOB',
        description: description,
      })
      .catch((err) => {
        console.error('Analysis request failed:', err.message);
        return { error: err.message };
      });

    if (response && response.success) {
      const analysis: AIAnalysisData = {
        email: response.data.email || '',
        score: response.data.score,
        summary: response.data.summary || '',
      };

      const emailEl = document.getElementById('email') as HTMLInputElement;
      if (analysis.email) {
        if (emailEl) emailEl.value = analysis.email;
      } else {
        if (emailEl) emailEl.placeholder = 'No email found';
      }
      document.getElementById('scoreDisplay')!.textContent = analysis.score + '/100';
      (document.getElementById('aiAnalysis') as HTMLTextAreaElement).value = analysis.summary;
      showStatus('Analysis complete!', 'success');

      // Cache the analysis results alongside the scraped data
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const cacheKey = getCacheKey(tab.url!);
      const existing = await getCache(cacheKey);
      await setCache(cacheKey, {
        scraped: existing ? existing.scraped : null,
        analysis: analysis,
      });
    } else {
      showStatus('AI Analysis failed: ' + (response?.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    showStatus('AI Error: ' + (error as Error).message, 'error');
  } finally {
    analyzeBtn.textContent = '✨ Run AI Analysis';
    // Cooldown before re-enabling
    setTimeout(() => {
      analyzeBtn.disabled = false;
      isAnalyzing = false;
    }, COOLDOWN_MS);
  }
}

// ─── Save to Notion ─────────────────────────────────────────────
async function saveToNotion(e: Event): Promise<void> {
  e.preventDefault();

  if (!navigator.onLine) {
    showStatus('You are offline. Check connection.', 'error');
    return;
  }

  if (isSaving) return; // Prevent double-click
  isSaving = true;

  const getVal = (id: string): string => {
    return (document.getElementById(id) as HTMLInputElement)?.value || '';
  };

  const jobUrl = getVal('link');

  saveBtn.textContent = 'Checking...';
  saveBtn.disabled = true;

  // Check for duplicates first
  try {
    const dupCheck = await chrome.runtime
      .sendMessage({
        action: 'CHECK_DUPLICATE',
        url: jobUrl,
      })
      .catch((err) => {
        console.warn('Duplicate check failed:', err.message);
        return { error: err.message };
      });

    if (dupCheck && dupCheck.isDuplicate) {
      const proceed = confirm(
        `⚠️ This job was already saved to Notion.\n\nDo you want to save it again?`,
      );
      if (!proceed) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save to Notion';
        isSaving = false;
        showStatus('Save cancelled — duplicate found.', 'error');
        return;
      }
    }
  } catch {
    // Don't block saving if duplicate check fails
    console.warn('Duplicate check failed, proceeding with save');
  }

  const formData = {
    company: getVal('company'),
    position: getVal('position'),
    platform: getVal('platform'),
    status: getVal('statusSelect'),
    salary: getVal('salary'),
    link: jobUrl,
    appLink: getVal('appLink'),
    companyUrl: getVal('companyUrl'),
    email: getVal('email'),
    score: (document.getElementById('scoreDisplay')?.textContent || '')
      .replace('/100', '')
      .replace('--', '0'),
    description: getVal('fullDescription'),
    descriptionBlocks: window.jobDescriptionBlocks || [],
    summary: getVal('aiAnalysis'),
  };

  saveBtn.textContent = 'Saving...';

  try {
    const response = await chrome.runtime
      .sendMessage({
        action: 'SAVE_TO_NOTION',
        data: formData,
      })
      .catch((err) => {
        console.error('Save request failed:', err.message);
        return { error: err.message };
      });

    if (response && response.success) {
      // Clear cache for this job after successful save
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const cacheKey = getCacheKey(tab.url!);
      await chrome.storage.session.remove(cacheKey);

      if (response.url) {
        showStatusHTML(
          `Saved! <a href="${response.url}" target="_blank" style="color:white;text-decoration:underline;margin-left:8px;">Open Notion Page</a>`,
          'success',
          8000,
        );
      } else {
        showStatus('Saved to Notion!', 'success', 4000);
      }

      isSaving = false;
    } else {
      showStatus('Save failed: ' + (response?.error || 'Unknown error'), 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save to Notion';
      isSaving = false;
    }
  } catch (error) {
    showStatus('Save Error: ' + (error as Error).message, 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save to Notion';
    isSaving = false;
  }
}

// ─── UI Helpers ─────────────────────────────────────────────────
function showStatus(msg: string, type: string, timeout = 4000): void {
  statusDiv.textContent = msg;
  statusDiv.className = type;
  statusDiv.style.display = 'block';
  setTimeout(() => {
    statusDiv.style.display = 'none';
    statusDiv.textContent = '';
  }, timeout);
}

function showStatusHTML(html: string, type: string, timeout = 4000): void {
  statusDiv.innerHTML = html;
  statusDiv.className = type;
  statusDiv.style.display = 'block';
  setTimeout(() => {
    statusDiv.style.display = 'none';
    statusDiv.innerHTML = '';
  }, timeout);
}

function showError(msg: string): void {
  skeletonContainer.classList.add('hidden');
  errorMessageDiv.textContent = msg;
  errorMessageDiv.classList.remove('hidden');
}

function showUnsupported(): void {
  loadingDiv.classList.add('hidden');
  contentDiv.classList.add('hidden');
  unsupportedDiv.classList.remove('hidden');
}
