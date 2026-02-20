/**
 * DOM Utilities for CareerStack
 * Shared utilities for extracting and parsing job description DOM content.
 *
 * Loaded as a classic content script — exposes functions to the global scope.
 */

/**
 * Extracts email addresses from text using regex.
 * Filters out common false positives (image filenames, noreply, etc.)
 *
 * @param {string} text - Text to search for emails.
 * @returns {string|null} - The first real email found, or null.
 */
function extractEmails(text) {
    if (!text) return null;

    // Match email patterns
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    if (!matches) return null;

    // Filter out false positives
    const blacklist = [
        'noreply', 'no-reply', 'donotreply', 'do-not-reply',
        'mailer-daemon', 'postmaster', 'example.com', 'test.com',
        'sentry.io', 'github.com'
    ];
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];

    for (const email of matches) {
        const lower = email.toLowerCase();

        // Skip blacklisted
        if (blacklist.some(b => lower.includes(b))) continue;

        // Skip image filenames mistaken for emails (e.g. icon@2x.png)
        if (imageExtensions.some(ext => lower.endsWith(ext))) continue;

        // Skip very short local parts (likely noise)
        const localPart = lower.split('@')[0];
        if (localPart.length < 2) continue;

        return email;
    }

    return null;
}

/**
 * Extracts a job description element into:
 * 1. Plain text (for AI/Popup display)
 * 2. Structured blocks (for Notion: heading_2, bulleted_list_item, paragraph) with Rich Text
 *
 * @param {HTMLElement} element - The DOM element containing the job description.
 * @returns {{ text: string, blocks: Array<{ type: string, richText: Array }> }}
 */
function extractJobDescription(element) {
    if (!element) return { text: '', blocks: [] };

    let blocks = [];

    // WIP Block State
    let currentBlockType = 'paragraph';
    let currentRichText = [];

    const flushBlock = () => {
        const cleanRichText = currentRichText.filter(s => s.text);

        if (cleanRichText.length > 0) {
            const hasContent = cleanRichText.some(s => s.text.trim().length > 0);
            if (hasContent) {
                blocks.push({
                    type: currentBlockType,
                    richText: cleanRichText
                });
            }
        }
        currentBlockType = 'paragraph';
        currentRichText = [];
    };

    function traverse(node, context = { bold: false, italic: false }) {
        if (node.nodeType === Node.TEXT_NODE) {
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

            const isHeader = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tag);
            const isList = ['UL', 'OL'].includes(tag);
            const isItem = ['LI'].includes(tag);
            const isBlock = ['DIV', 'P', 'SECTION', 'ARTICLE', 'BLOCKQUOTE'].includes(tag);

            const isBold = ['STRONG', 'B'].includes(tag) || style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 600;
            const isItalic = ['EM', 'I'].includes(tag) || style.fontStyle === 'italic';
            const isBr = tag === 'BR';

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

            Array.from(node.childNodes).forEach(child => traverse(child, newContext));
        }
    }

    traverse(element);
    flushBlock();

    const plainText = blocks.map(b => {
        const content = b.richText.map(r => r.text).join('');
        if (b.type.includes('heading')) return `\n\n**${content.trim()}**\n\n`;
        if (b.type === 'bulleted_list_item') return `\n• ${content.trim()}`;
        return `\n${content.trim()}\n`;
    }).join('').trim();

    return { text: plainText, blocks: blocks };
}
