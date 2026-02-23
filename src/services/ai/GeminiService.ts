/**
 * GeminiService — Handles AI analysis via the Google Gemini API.
 */
import type { AIServiceResult } from '../../types';
import { fetchWithRetry, getReadableError } from '../../utils/retry';
import { CONFIG } from '../../config/constants';

export class GeminiService {
  /**
   * Calls the Gemini API with the given prompt.
   * Retries on transient failures with exponential backoff.
   */
  async analyze(apiKey: string, prompt: string): Promise<AIServiceResult> {
    const { ENDPOINT, DEFAULT_MODEL } = CONFIG.AI.GEMINI;
    const url = `${ENDPOINT}/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: 'application/json',
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(getReadableError('AI', response.status, data.error?.message));
    }

    try {
      const text: string = data.candidates[0].content.parts[0].text;
      const jsonStr = text.replace(/```json|```/g, '').trim();
      return { success: true, data: JSON.parse(jsonStr) };
    } catch {
      return { error: 'Failed to parse Gemini response', raw: data };
    }
  }
}
