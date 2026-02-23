/**
 * OpenAIService — Handles AI analysis via the OpenAI API.
 */
import type { AIServiceResult } from '../../types';
import { fetchWithRetry, getReadableError } from '../../utils/retry';
import { CONFIG } from '../../config/constants';

export class OpenAIService {
    /**
     * Calls the OpenAI Chat Completions API with the given prompt.
     * Retries on transient failures with exponential backoff.
     */
    async analyze(apiKey: string, prompt: string): Promise<AIServiceResult> {
        const url = CONFIG.AI.OPENAI.ENDPOINT;

        const response = await fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: CONFIG.AI.OPENAI.DEFAULT_MODEL,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                temperature: 0.1
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(getReadableError('AI', response.status, data.error?.message));
        }

        try {
            const text: string = data.choices[0].message.content;
            return { success: true, data: JSON.parse(text) };
        } catch {
            return { error: 'Failed to parse OpenAI response', raw: data };
        }
    }
}
