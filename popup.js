document.addEventListener('DOMContentLoaded', initializePopup);

// DOM Elements
const form = document.getElementById('job-form');
const analyzeBtn = document.getElementById('analyzeBtn');
const saveBtn = document.getElementById('saveBtn');
const loadingDiv = document.getElementById('loading');
const contentDiv = document.getElementById('main-content');
const statusDiv = document.getElementById('status');

async function initializePopup() {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if we are on a supported site
    if (tab.url.includes('linkedin.com') || tab.url.includes('indeed.com')) {
        // Send message to content script
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_JOB' });
            if (response) {
                populateForm(response);
            } else {
                showError('Could not scrape page. Try refreshing.');
                console.log("No response from content script");
            }
        } catch (error) {
            console.warn('Initial connection to content script failed. Attempting to inject...', error.message);
            // Try injecting script if not present (optional, but good for stability)
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                // Retry message
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_JOB' });
                if (response) populateForm(response);
            } catch (e) {
                showError('Please refresh the page and try again.');
            }
        }
    } else {
        showError('This site is not supported. Navigate to LinkedIn or Indeed.');
    }

    // Bind buttons
    analyzeBtn.addEventListener('click', runAIAnalysis);
    form.addEventListener('submit', saveToNotion);
}

function populateForm(data) {
    loadingDiv.classList.add('hidden');
    contentDiv.classList.remove('hidden');

    if (document.getElementById('company')) document.getElementById('company').value = data.company || '';
    if (document.getElementById('position')) document.getElementById('position').value = data.position || '';
    if (document.getElementById('platform')) document.getElementById('platform').value = data.platform || 'Other';

    // Try to parse salary if available
    if (data.salary) document.getElementById('salary').value = data.salary;

    // Link
    document.getElementById('link').value = data.url;

    // Application Link (if scraped external link)
    if (data.appLink) document.getElementById('appLink').value = data.appLink;

    // Company Profile URL
    if (data.companyUrl) document.getElementById('companyUrl').value = data.companyUrl;

    // Full description (hidden)
    if (data.description) document.getElementById('fullDescription').value = data.description;

    // Store blocks
    if (data.descriptionBlocks) {
        window.jobDescriptionBlocks = data.descriptionBlocks;
    }
}

async function runAIAnalysis() {
    const description = document.getElementById('fullDescription').value;
    if (!description) {
        showStatus('No job description found to analyze.', 'error');
        return;
    }

    analyzeBtn.textContent = 'Analyzing...';
    analyzeBtn.disabled = true;

    try {
        // Send message to background to handle AI call (to keep popup logic clean and allow background processing)
        const response = await chrome.runtime.sendMessage({
            action: 'ANALYZE_JOB',
            description: description
        });

        if (response && response.success) {
            document.getElementById('email').value = response.data.email || '';
            document.getElementById('scoreDisplay').textContent = response.data.score + '/100';
            document.getElementById('aiAnalysis').value = response.data.summary || '';
            showStatus('Analysis complete!', 'success');
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
