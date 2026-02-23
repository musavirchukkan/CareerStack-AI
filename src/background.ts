/**
 * Background Service Worker — Event Listener & Delegation
 *
 * Handles messages from the popup and delegates to the
 * appropriate service modules.
 */
import { AIService } from './services/AIService';
import { NotionService } from './services/NotionService';
import { ConfigService } from './services/ConfigService';
import type { ExtensionMessage } from './types';

// Setup periodic fetch for dynamic scrapers over the air updates
chrome.runtime.onInstalled.addListener((details) => {
  ConfigService.fetchAndCache().catch(console.error);
  chrome.alarms.create('refresh-selectors', { periodInMinutes: 360 }); // 6 hours

  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: 'options/options.html' });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refresh-selectors') {
    ConfigService.fetchAndCache().catch(console.error);
  }
});

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
  if (request.action === 'GET_SELECTORS') {
    ConfigService.getSelectors().then(sendResponse);
    return true; // async response
  }
});
