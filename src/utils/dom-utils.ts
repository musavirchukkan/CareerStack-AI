/**
 * DOM Utilities for CareerStack
 * Shared utilities for extracting and parsing job description DOM content.
 */
import type { DescriptionBlock, DescriptionResult, RichTextSegment, TextAnnotations } from '../types';

/**
 * Sanitizes plain text by removing trailing/leading whitespaces and stripping 
 * any accidental HTML tags that might have been included.
 */
export function sanitizeText(text: string | null | undefined): string {
    if (!text) return '';
    // Strip HTML tags using a basic regex
    const noTags = text.replace(/<[^>]*>?/gm, '');
    return noTags.trim();
}

/**
 * Extracts email addresses from text using regex.
 * Filters out common false positives (image filenames, noreply, etc.)
 */
export function extractEmails(text: string): string | null {
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
 */
export function extractJobDescription(element: HTMLElement): DescriptionResult {
    if (!element) return { text: '', blocks: [] };

    const blocks: DescriptionBlock[] = [];

    // WIP Block State
    let currentBlockType: DescriptionBlock['type'] = 'paragraph';
    let currentRichText: RichTextSegment[] = [];

    const flushBlock = (): void => {
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

    function traverse(node: Node, context: TextAnnotations = { bold: false, italic: false }): void {
        if (node.nodeType === Node.TEXT_NODE) {
            let txt = node.textContent?.replace(/[\n\t]+/g, ' ') ?? '';

            if (txt) {
                currentRichText.push({
                    text: txt,
                    annotations: { ...context }
                });
            }
        }
        else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const tag = el.tagName;
            const style = window.getComputedStyle(el);

            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

            const isHeader = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tag);
            const isList = ['UL', 'OL'].includes(tag);
            const isItem = ['LI'].includes(tag);
            const isBlock = ['DIV', 'P', 'SECTION', 'ARTICLE', 'BLOCKQUOTE'].includes(tag);

            const isBold = ['STRONG', 'B'].includes(tag) || style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 600;
            const isItalic = ['EM', 'I'].includes(tag) || style.fontStyle === 'italic';
            const isBr = tag === 'BR';

            const newContext: TextAnnotations = {
                bold: context.bold || isBold,
                italic: context.italic || isItalic
            };

            if (isHeader) {
                flushBlock();
                currentBlockType = 'heading_2';
                Array.from(el.childNodes).forEach(child => traverse(child, newContext));
                flushBlock();
                return;
            }

            if (isList) {
                flushBlock();
                Array.from(el.children).forEach(child => traverse(child, newContext));
                flushBlock();
                return;
            }

            if (isItem) {
                flushBlock();
                currentBlockType = 'bulleted_list_item';
                Array.from(el.childNodes).forEach(child => traverse(child, newContext));
                flushBlock();
                return;
            }

            if (isBr) {
                currentRichText.push({ text: '\n', annotations: { ...context } });
                return;
            }

            if (isBlock) {
                flushBlock();
                Array.from(el.childNodes).forEach(child => traverse(child, newContext));
                flushBlock();
                return;
            }

            Array.from(el.childNodes).forEach(child => traverse(child, newContext));
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
