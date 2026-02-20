/**
 * NotionService — Encapsulates all Notion API logic,
 * including page creation and block construction.
 */
export class NotionService {
    /**
     * Saves job data to the user's Notion database.
     * @param {object} data - The job data from the popup form.
     * @returns {Promise<{ success?: boolean, error?: string }>}
     */
    static async save(data) {
        try {
            const settings = await chrome.storage.sync.get(['notionSecret', 'databaseId']);
            if (!settings.notionSecret || !settings.databaseId) {
                return { error: 'Missing Notion settings.' };
            }

            const today = new Date().toISOString().split('T')[0];

            const body = {
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
                    'Match Score': { number: parseInt(data.score) || 0 },
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

            // Add description blocks
            if (data.descriptionBlocks && data.descriptionBlocks.length > 0) {
                const notionBlocks = data.descriptionBlocks.map(b => NotionService.createBlock(b)).filter(b => b);
                body.children.push(...notionBlocks);
            } else {
                body.children.push(...NotionService.chunkTextToBlocks(data.description));
            }

            // Add summary if available
            if (data.summary) {
                body.children.push({
                    object: 'block',
                    type: 'heading_2',
                    heading_2: {
                        rich_text: [{ text: { content: 'AI Summary' } }]
                    }
                });
                body.children.push({
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{ text: { content: data.summary } }]
                    }
                });
            }

            const response = await fetch('https://api.notion.com/v1/pages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${settings.notionSecret}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify(body)
            });

            const resData = await response.json();
            if (!response.ok) {
                throw new Error(resData.message || 'Notion API Error');
            }

            return { success: true };

        } catch (error) {
            console.error('Notion Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Converts a scraped block into a Notion API block object.
     * @param {object} block
     * @returns {object|null}
     */
    static createBlock(block) {
        if (!block) return null;

        let notionRichText = [];

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
     * @param {string} text
     * @returns {Array<object>}
     */
    static chunkTextToBlocks(text) {
        if (!text) return [];
        const blocks = [];
        const chunkSize = 2000;

        for (let i = 0; i < text.length;) {
            let limit = Math.min(i + chunkSize, text.length);
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

            let chunk = text.substring(i, end);
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
