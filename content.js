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
        const salaryEl = detailContainer.querySelector('.jobs-unified-top-card__salary-info');
        if (salaryEl) data.salary = salaryEl.innerText.trim();

        // Description - PRESERVE FORMATTING
        const descEl = detailContainer.querySelector('#job-details') ||
            document.querySelector('.jobs-description-content__text');
        if (descEl) {
            const { text, blocks } = extractJobDescription(descEl);
            data.description = text;
            data.descriptionBlocks = blocks;
        }

        // Apply Link
        // Try multiple selectors for the apply button/link
        const applySelectors = [
            '.jobs-apply-button--top-card a',
            '.jobs-apply-button--top-card button',
            '.jobs-s-apply button',
            '[data-control-name="jobdetails_topcard_inapply"]',
            '.jobs-unified-top-card__start-application-button'
        ];

        for (const selector of applySelectors) {
            const el = detailContainer.querySelector(selector);
            if (el) {
                // If it's an A tag, get href
                if (el.tagName === 'A') {
                    data.appLink = el.href;
                    break;
                }
                // If it's a button, check parent or window.open logic
                const parentLink = el.closest('a');
                if (parentLink) {
                    data.appLink = parentLink.href;
                    break;
                }
            }
        }

        // Fallback: Use heuristics - find a button/link with text "Apply" in the top card area
        if (!data.appLink) {
            const topCard = detailContainer.querySelector('.job-details-jobs-unified-top-card__content--two-pane') ||
                detailContainer.querySelector('.jobs-unified-top-card') ||
                detailContainer;

            const buttons = topCard.querySelectorAll('button, a');
            for (const btn of buttons) {
                const text = btn.innerText || '';
                const aria = btn.getAttribute('aria-label') || '';
                if (text.includes('Apply') || aria.includes('Apply')) {
                    // If it's a link, use it
                    if (btn.tagName === 'A') {
                        data.appLink = btn.href;
                        break;
                    }
                    // If button is wrapped in link
                    const parentLink = btn.closest('a');
                    if (parentLink) {
                        data.appLink = parentLink.href;
                        break;
                    }
                }
            }
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
            const { text, blocks } = extractJobDescription(descEl);
            data.description = text;
            data.descriptionBlocks = blocks;
        }
    }

    // Apply Link (Direct Page)
    const applyBtn = document.querySelector('a[aria-label^="Apply on company website"]');
    if (applyBtn) {
        // LinkedIn sometimes wraps external links in a redirect
        const url = new URL(applyBtn.href);
        // If it's a redirect, decode the 'url' param
        if (url.hostname === 'www.linkedin.com' && url.pathname.includes('/redirect')) {
            const target = url.searchParams.get('url');
            if (target) data.appLink = target;
        } else {
            data.appLink = applyBtn.href;
        }
    }


    // Last Resort: Check LD-JSON script tags for JobPosting schema
    if (!data.appLink) {
        try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
                try {
                    const json = JSON.parse(script.innerText);
                    const job = Array.isArray(json)
                        ? json.find(j => j['@type'] === 'JobPosting')
                        : (json['@type'] === 'JobPosting' ? json : null);

                    if (job) {
                        if (job.url) {
                            data.appLink = job.url;
                            break;
                        }
                        if (job.applyUrl) {
                            data.appLink = job.applyUrl;
                            break;
                        }
                    }
                } catch (e) { /* ignore parse errors */ }
            }
        } catch (e) { console.log('Error parsing LD-JSON', e); }
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

    const titleEl = document.querySelector('.jobsearch-JobInfoHeader-title');
    if (titleEl) data.position = titleEl.innerText.trim();

    const companyEl = document.querySelector('[data-company-name="true"]');
    if (companyEl) data.company = companyEl.innerText.trim();

    const salaryEl = document.querySelector('#salaryInfoAndJobType');
    if (salaryEl) data.salary = salaryEl.innerText.trim();

    const descEl = document.querySelector('#jobDescriptionText');
    if (descEl) {
        const { text, blocks } = extractJobDescription(descEl);
        data.description = text;
        data.descriptionBlocks = blocks;
    }

    // Apply Link
    const applyBtn = document.querySelector('#applyButtonLinkContainer a');
    if (applyBtn) data.appLink = applyBtn.href;

    return data;
}

/**
 * Extracts job description into:
 * 1. Plain text (for AI/Popup)
 * 2. Structured blocks (for Notion: H2, H3, BulletList, Paragraph) with Rich Text
 */
function extractJobDescription(element) {
    if (!element) return { text: '', blocks: [] };

    let blocks = [];

    // WIP Block State
    let currentBlockType = 'paragraph';
    let currentRichText = []; // Array of { text: string, annotations: { bold: boolean, italic: boolean } }

    // Flush current state to blocks
    const flushBlock = () => {
        // Filter empty text segments
        const cleanRichText = currentRichText.filter(s => s.text);

        if (cleanRichText.length > 0) {
            // If all segments are whitespace, don't push (unless it's a meaningful break)
            const hasContent = cleanRichText.some(s => s.text.trim().length > 0);
            if (hasContent) {
                blocks.push({
                    type: currentBlockType,
                    richText: cleanRichText
                });
            }
        }
        // Reset
        currentBlockType = 'paragraph';
        currentRichText = [];
    };

    function traverse(node, context = { bold: false, italic: false }) {
        if (node.nodeType === Node.TEXT_NODE) {
            // Replace newlines/tabs with spaces to prevent breaking layout, but keep spaces
            let txt = node.textContent.replace(/[\n\t]+/g, ' ');

            if (txt) {
                currentRichText.push({
                    text: txt,
                    annotations: { ...context }
                });
            }
        }
        else if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.tagName;
            const style = window.getComputedStyle(node);

            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

            // Block handling
            const isHeader = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tag);
            const isList = ['UL', 'OL'].includes(tag);
            const isItem = ['LI'].includes(tag);
            // Divs and Ps usually start new blocks
            const isBlock = ['DIV', 'P', 'SECTION', 'ARTICLE', 'BLOCKQUOTE'].includes(tag);

            // Inline Styles
            const isBold = ['STRONG', 'B'].includes(tag) || style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 600;
            const isItalic = ['EM', 'I'].includes(tag) || style.fontStyle === 'italic';
            const isBr = tag === 'BR';

            // New Block Context
            const newContext = {
                bold: context.bold || isBold,
                italic: context.italic || isItalic
            };

            if (isHeader) {
                flushBlock();
                currentBlockType = 'heading_2';
                Array.from(node.childNodes).forEach(child => traverse(child, newContext));
                flushBlock();
                return;
            }

            if (isList) {
                flushBlock();
                Array.from(node.children).forEach(child => traverse(child, newContext));
                flushBlock();
                return;
            }

            if (isItem) {
                flushBlock();
                currentBlockType = 'bulleted_list_item';
                Array.from(node.childNodes).forEach(child => traverse(child, newContext));
                flushBlock();
                return;
            }

            if (isBr) {
                currentRichText.push({ text: '\n', annotations: { ...context } });
                return;
            }

            if (isBlock) {
                flushBlock();
                Array.from(node.childNodes).forEach(child => traverse(child, newContext));
                flushBlock();
                return;
            }

            // Default traversal for inline elements
            Array.from(node.childNodes).forEach(child => traverse(child, newContext));
        }
    }

    traverse(element);
    flushBlock();

    // Reconstruct plain text from rich blocks for the UI/AI
    // This ensures consistency
    const plainText = blocks.map(b => {
        const content = b.richText.map(r => r.text).join('');
        if (b.type.includes('heading')) return `\n\n**${content.trim()}**\n\n`;
        if (b.type === 'bulleted_list_item') return `\n• ${content.trim()}`;
        return `\n${content.trim()}\n`;
    }).join('').trim();

    return { text: plainText, blocks: blocks };
}
