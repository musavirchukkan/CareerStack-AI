/**
 * GeminiService — Handles AI analysis via the Google Gemini API.
 */
import type { AIServiceResult } from '../../types';

export class GeminiService {
    /**
     * Calls the Gemini API with the given prompt.
     */
    async analyze(apiKey: string, prompt: string): Promise<AIServiceResult> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    // Forces the model to output a valid JSON object
                    response_mime_type: 'application/json'
                }
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Gemini API Error');

        try {
            const text: string = data.candidates[0].content.parts[0].text;
            const jsonStr = text.replace(/```json|```/g, '').trim();
            return { success: true, data: JSON.parse(jsonStr) };
        } catch {
            return { error: 'Failed to parse Gemini response', raw: data };
        }
    }
}
