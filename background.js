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
                "Status": { status: { name: "Not Applied" } }, // Ensure this matches user's schema
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
                },
                // Chunk description (Notion limit 2000 chars per block)
                ...chunkTextToBlocks(data.description)
            ]
        };

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

function chunkTextToBlocks(text) {
    if (!text) return [];
    const blocks = [];
    const chunkSize = 2000;

    // Split text into chunks that fit within Notion's 2000 char limit
    // We try to split at newlines to avoid breaking words mid-sentence where possible
    for (let i = 0; i < text.length; i += chunkSize) {
        let chunk = text.substring(i, Math.min(i + chunkSize, text.length));
        blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
                rich_text: [{ text: { content: chunk } }]
            }
        });
    }
    return blocks;
}
