/**
 * OpenAIService — Handles AI analysis via the OpenAI API.
 */
import type { AIServiceResult } from '../../types';

export class OpenAIService {
    /**
     * Calls the OpenAI Chat Completions API with the given prompt.
     */
    async analyze(apiKey: string, prompt: string): Promise<AIServiceResult> {
        const url = 'https://api.openai.com/v1/chat/completions';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                // GPT-4o-mini: faster and smarter than 3.5-turbo
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                temperature: 0.1
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'OpenAI API Error');

        try {
            const text: string = data.choices[0].message.content;
            return { success: true, data: JSON.parse(text) };
        } catch {
            return { error: 'Failed to parse OpenAI response', raw: data };
        }
    }
}
