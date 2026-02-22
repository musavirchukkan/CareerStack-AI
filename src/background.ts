/**
 * Background Service Worker — Event Listener & Delegation
 *
 * Handles messages from the popup and delegates to the
 * appropriate service modules.
 */
import { AIService } from './services/AIService';
import { NotionService } from './services/NotionService';
import type { ExtensionMessage } from './types';

chrome.runtime.onMessage.addListener((request: ExtensionMessage, _sender, sendResponse) => {
    if (request.action === 'ANALYZE_JOB') {
        AIService.analyze(request.description).then(sendResponse);
        return true; // async response
    }
    if (request.action === 'SAVE_TO_NOTION') {
        NotionService.save(request.data).then(sendResponse);
        return true; // async response
    }
    if (request.action === 'CHECK_DUPLICATE') {
        NotionService.checkDuplicate(request.url).then(sendResponse);
        return true; // async response
    }
});
