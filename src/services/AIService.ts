/**
 * AIService — Factory that selects the correct AI provider
 * based on user settings and delegates the analysis.
 */
import type { AIServiceResult } from '../types';
import { GeminiService } from './ai/GeminiService';
import { OpenAIService } from './ai/OpenAIService';
import { decryptData } from '../utils/encryption';

const gemini = new GeminiService();
const openai = new OpenAIService();

export class AIService {
    /**
     * Runs AI analysis on a job description against the user's resume.
     * Reads settings from chrome.storage to select provider and key.
     */
    static async analyze(jobDescription: string): Promise<AIServiceResult> {
        try {
            const settings = await chrome.storage.sync.get(['aiProvider', 'aiKey']);
            const localSettings = await chrome.storage.local.get(['masterResume']);

            if (!settings.aiKey) return { error: 'Missing AI API Key. Please configure in Options.' };
            const decryptedKey = await decryptData(settings.aiKey);
            if (!localSettings.masterResume) return { error: 'Missing Master Resume. Please configure in Options.' };

            const prompt = `
      You are a career assistant. Analyze the following Job Description against the User's Resume.
      
      User Resume:
      ${(localSettings.masterResume as string).substring(0, 10000)}
      
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
                return await gemini.analyze(decryptedKey, prompt);
            } else {
                return await openai.analyze(decryptedKey, prompt);
            }

        } catch (error) {
            console.error('AI Error:', error);
            return { error: (error as Error).message };
        }
    }
}
