/**
 * NotionService — Encapsulates all Notion API logic,
 * including page creation and block construction.
 */
import type { NotionSaveData, NotionSaveResult, DuplicateCheckResult, DescriptionBlock } from '../types';
import { fetchWithRetry, getReadableError } from '../utils/retry';
import { decryptData } from '../utils/encryption';
import { CONFIG } from '../config/constants';

export class NotionService {
    /**
     * Checks if a job URL already exists in the Notion database.
     * Queries the "Source URL" property.
     */
    static async checkDuplicate(jobUrl: string): Promise<DuplicateCheckResult> {
        try {
            const settings = await chrome.storage.sync.get(['notionSecret', 'databaseId']);
            if (!settings.notionSecret || !settings.databaseId) {
                return { isDuplicate: false };
            }
            const decryptedSecret = await decryptData(settings.notionSecret);

            const response = await fetchWithRetry(
                `${CONFIG.NOTION.BASE_URL}/databases/${settings.databaseId}/query`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${decryptedSecret}`,
                        'Content-Type': 'application/json',
                        'Notion-Version': CONFIG.NOTION.API_VERSION
                    },
                    body: JSON.stringify({
                        filter: {
                            property: 'Source URL',
                            url: { equals: jobUrl }
                        },
                        page_size: 1
                    })
                }
            );

            if (!response.ok) {
                // Don't block saving if duplicate check fails
                console.warn('Duplicate check failed:', response.status);
                return { isDuplicate: false };
            }

            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const existingPage = data.results[0];
                const pageUrl = existingPage.url || `https://notion.so/${existingPage.id.replace(/-/g, '')}`;
                return { isDuplicate: true, existingUrl: pageUrl };
            }

            return { isDuplicate: false };
        } catch (error) {
            console.warn('Duplicate check error:', error);
            return { isDuplicate: false };
        }
    }

    /**
     * Saves job data to the user's Notion database.
     * Retries on transient failures with exponential backoff.
     */
    static async save(data: NotionSaveData): Promise<NotionSaveResult> {
        try {
            const settings = await chrome.storage.sync.get(['notionSecret', 'databaseId']);
            if (!settings.notionSecret || !settings.databaseId) {
                return { error: 'Missing Notion settings. Please configure in Options.' };
            }
            const decryptedSecret = await decryptData(settings.notionSecret);

            const today = new Date().toISOString().split('T')[0];

            const body: Record<string, unknown> = {
                parent: { database_id: settings.databaseId },
                properties: {
                    'Company': {
                        title: [{
                            text: {
                                content: data.company || 'Unknown Company',
                                link: data.companyUrl ? { url: data.companyUrl } : null
                            }
                        }]
                    },
                    'Position': { rich_text: [{ text: { content: data.position || 'Unknown Position' } }] },
                    'Status': { status: { name: data.status || 'Not Applied' } },
                    'Platform': { select: { name: data.platform || 'Other' } },
                    'Salary': { rich_text: [{ text: { content: data.salary || '' } }] },
                    'Source URL': { url: data.link || null },
                    'Apply Link': { url: data.appLink || null },
                    'Email': { email: data.email || null },
                    'Match Score': { number: parseInt(data.score || '0') || 0 },
                    'Application Date': { date: { start: today } }
                },
                children: [
                    {
                        object: 'block',
                        type: 'heading_2',
                        heading_2: {
                            rich_text: [{ text: { content: 'Job Description' } }]
                        }
                    }
                ]
            };

            const children = body.children as Record<string, unknown>[];

            // Add description blocks
            if (data.descriptionBlocks && data.descriptionBlocks.length > 0) {
                const notionBlocks = data.descriptionBlocks
                    .map(b => NotionService.createBlock(b))
                    .filter((b): b is Record<string, unknown> => b !== null);
                children.push(...notionBlocks);
            } else {
                children.push(...NotionService.chunkTextToBlocks(data.description));
            }

            // Add summary if available
            if (data.summary) {
                children.push({
                    object: 'block',
                    type: 'heading_2',
                    heading_2: {
                        rich_text: [{ text: { content: 'AI Summary' } }]
                    }
                });
                children.push({
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{ text: { content: data.summary } }]
                    }
                });
            }

            const response = await fetchWithRetry(`${CONFIG.NOTION.BASE_URL}/pages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${decryptedSecret}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': CONFIG.NOTION.API_VERSION
                },
                body: JSON.stringify(body)
            });

            const resData = await response.json();
            if (!response.ok) {
                return { error: getReadableError('Notion', response.status, resData.message) };
            }

            const pageUrl = resData.url || `https://notion.so/${resData.id.replace(/-/g, '')}`;
            return { success: true, url: pageUrl };

        } catch (error) {
            console.error('Notion Error:', error);
            return { error: (error as Error).message };
        }
    }

    /**
     * Converts a scraped block into a Notion API block object.
     */
    static createBlock(block: DescriptionBlock): Record<string, unknown> | null {
        if (!block) return null;

        let notionRichText: Record<string, unknown>[];

        if (block.richText && Array.isArray(block.richText)) {
            notionRichText = block.richText.map(segment => ({
                type: 'text',
                text: { content: segment.text.substring(0, 2000) },
                annotations: {
                    bold: segment.annotations ? segment.annotations.bold : false,
                    italic: segment.annotations ? segment.annotations.italic : false
                }
            }));
        } else if (block.content) {
            notionRichText = [{
                type: 'text',
                text: { content: block.content.substring(0, 2000) }
            }];
        } else {
            return null;
        }

        if (block.type === 'heading_2') {
            return {
                object: 'block',
                type: 'heading_3',
                heading_3: { rich_text: notionRichText }
            };
        }

        if (block.type === 'bulleted_list_item') {
            return {
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: { rich_text: notionRichText }
            };
        }

        // Default: paragraph
        return {
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: notionRichText }
        };
    }

    /**
     * Splits plain text into paragraph blocks that fit Notion's 2000 char limit.
     */
    static chunkTextToBlocks(text: string): Record<string, unknown>[] {
        if (!text) return [];
        const blocks: Record<string, unknown>[] = [];
        const chunkSize = 2000;

        for (let i = 0; i < text.length;) {
            const limit = Math.min(i + chunkSize, text.length);
            let end = limit;

            if (end < text.length) {
                const lastNewline = text.lastIndexOf('\n', end);
                if (lastNewline > i) {
                    end = lastNewline + 1;
                } else {
                    const lastSpace = text.lastIndexOf(' ', end);
                    if (lastSpace > i) {
                        end = lastSpace + 1;
                    }
                }
            }

            const chunk = text.substring(i, end);
            blocks.push({
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [{ text: { content: chunk } }]
                }
            });

            i = end;
        }
        return blocks;
    }
}
