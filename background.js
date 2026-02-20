/**
 * Background Service Worker — Event Listener & Delegation
 *
 * Handles messages from the popup and delegates to the
 * appropriate service modules.
 */
import { AIService } from './services/AIService.js';
import { NotionService } from './services/NotionService.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ANALYZE_JOB') {
        AIService.analyze(request.description).then(sendResponse);
        return true; // async response
    }
    if (request.action === 'SAVE_TO_NOTION') {
        NotionService.save(request.data).then(sendResponse);
        return true; // async response
    }
});
