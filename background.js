chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ANALYZE_JOB') {
        handleAIAnalysis(request.description).then(sendResponse);
        return true; // async response
    }
    if (request.action === 'SAVE_TO_NOTION') {
        handleSaveToNotion(request.data).then(sendResponse);
        return true; // async response
    }
});

async function handleAIAnalysis(jobDescription) {
    try {
        const settings = await chrome.storage.sync.get(['aiProvider', 'aiKey']);
        const localSettings = await chrome.storage.local.get(['masterResume']);

        if (!settings.aiKey) return { error: 'Missing AI API Key. Please configure in Options.' };
        if (!localSettings.masterResume) return { error: 'Missing Master Resume. Please configure in Options.' };

        const prompt = `
      You are a career assistant. Analyze the following Job Description against the User's Resume.
      
      User Resume:
      ${localSettings.masterResume.substring(0, 10000)}
      
      Job Description:
      ${jobDescription.substring(0, 10000)}
      
      Task:
      1. Extract a recruiter email if present (else null).
      2. Score the match from 0-100 based on skills and experience overlap.
      3. Write a 1-sentence summary of why it's a match or mismatch.
      
      Return ONLY a valid JSON object:
      {
        "email": "string or null",
        "score": number,
        "summary": "string"
      }
    `;

        if (settings.aiProvider === 'gemini') {
            return await callGemini(settings.aiKey, prompt);
        } else {
            return await callOpenAI(settings.aiKey, prompt);
        }

    } catch (error) {
        console.error('AI Error:', error);
        return { error: error.message };
    }
}

async function callGemini(apiKey, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini API Error');

    const text = data.candidates[0].content.parts[0].text;
    try {
        // Clean markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return { success: true, data: JSON.parse(jsonStr) };
    } catch (e) {
        return { error: 'Failed to parse AI response' };
    }
}

async function callOpenAI(apiKey, prompt) {
    const url = 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'OpenAI API Error');

    const text = data.choices[0].message.content;
    try {
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return { success: true, data: JSON.parse(jsonStr) };
    } catch (e) {
        return { error: 'Failed to parse AI response' };
    }
}

async function handleSaveToNotion(data) {
    try {
        const settings = await chrome.storage.sync.get(['notionSecret', 'databaseId']);
        if (!settings.notionSecret || !settings.databaseId) {
            return { error: 'Missing Notion settings.' };
        }

        const today = new Date().toISOString().split('T')[0];

        const body = {
            parent: { database_id: settings.databaseId },
            properties: {
                "Company": { title: [{ text: { content: data.company || 'Unknown Company' } }] },
                "Position": { rich_text: [{ text: { content: data.position || 'Unknown Position' } }] },
                "Status": { status: { name: data.status || "Not Applied" } },
                "Platform": { select: { name: data.platform || "Other" } },
                "Salary": { rich_text: [{ text: { content: data.salary || '' } }] },
                "Source URL": { url: data.link || null },
                "Apply Link": { url: data.appLink || null },
                "Email": { email: data.email || null }, // valid email or null
                "Match Score": { number: parseInt(data.score) || 0 },
                "Application Date": { date: { start: today } }
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
            const notionBlocks = data.descriptionBlocks.map(createNotionBlock).filter(b => b);
            body.children.push(...notionBlocks);
        } else {
            // Fallback to text chunking if no structured data
            body.children.push(...chunkTextToBlocks(data.description));
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

function createNotionBlock(block) {
    if (!block) return null;

    // Helper to construct rich_text array for Notion
    let notionRichText = [];

    if (block.richText && Array.isArray(block.richText)) {
        notionRichText = block.richText.map(segment => ({
            type: 'text',
            text: { content: segment.text.substring(0, 2000) }, // Safety truncate per segment
            annotations: {
                bold: segment.annotations ? segment.annotations.bold : false,
                italic: segment.annotations ? segment.annotations.italic : false
            }
        }));
    } else if (block.content) {
        // Fallback for plain text blocks
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
            type: 'heading_3', // Map H2 to H3 for better visual hierarchy within the entry
            heading_3: {
                rich_text: notionRichText
            }
        };
    }

    if (block.type === 'bulleted_list_item') {
        return {
            object: 'block',
            type: 'bulleted_list_item',
            bulleted_list_item: {
                rich_text: notionRichText
            }
        };
    }

    // Default to paragraph
    return {
        object: 'block',
        type: 'paragraph',
        paragraph: {
            rich_text: notionRichText
        }
    };
}

function chunkTextToBlocks(text) {
    if (!text) return [];
    const blocks = [];
    const chunkSize = 2000;

    // Split text into chunks that fit within Notion's 2000 char limit
    // We try to split at newlines to avoid breaking words mid-sentence where possible
    for (let i = 0; i < text.length;) { // Remove 'i += chunkSize' from loop header
        let limit = Math.min(i + chunkSize, text.length);
        let end = limit;

        // If we strictly check for length, we might be in the middle of a word or sentence.
        // Try to find a newline close to the limit to break cleanly.
        if (end < text.length) {
            const lastNewline = text.lastIndexOf('\n', end);
            if (lastNewline > i) { // Ensure found newline is within current chunk
                end = lastNewline + 1; // Include the newline
            } else {
                // No newline found in this large chunk, try space?
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

        i = end; // Advance to where we cut off
    }
    return blocks;
}
