/**
 * Options Page Script — Settings management for CareerStack extension.
 */
import { encryptData, decryptData } from '../utils/encryption';


document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('options-form')!.addEventListener('submit', saveOptions);
document.getElementById('clearAllCacheBtn')!.addEventListener('click', async () => {
    await chrome.storage.session.clear();
    showStatus('All caches cleared!', 'success');
});

// Save options to chrome.storage
async function saveOptions(e: Event): Promise<void> {
    e.preventDefault();

    const notionSecretStr = (document.getElementById('notionSecret') as HTMLInputElement).value;
    const databaseId = (document.getElementById('databaseId') as HTMLInputElement).value;
    const aiProvider = (document.getElementById('aiProvider') as HTMLSelectElement).value;
    const aiKeyStr = (document.getElementById('aiKey') as HTMLInputElement).value;
    const autoFetch = (document.getElementById('autoFetch') as HTMLInputElement).checked;
    const masterResume = (document.getElementById('masterResume') as HTMLTextAreaElement).value;

    const saveBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (saveBtn) { saveBtn.textContent = 'Verifying...'; saveBtn.disabled = true; }

    // Test API Key
    let testSuccess = false;
    try {
        if (aiProvider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiKeyStr}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
            });
            testSuccess = res.ok;
        } else {
            const res = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${aiKeyStr}` }
            });
            testSuccess = res.ok;
        }
    } catch {
        testSuccess = false;
    }

    if (saveBtn) { saveBtn.textContent = 'Save Settings'; saveBtn.disabled = false; }

    const notionSecret = await encryptData(notionSecretStr);
    const aiKey = await encryptData(aiKeyStr);

    // Save settings to sync
    chrome.storage.sync.set(
        {
            notionSecret,
            databaseId,
            aiProvider,
            aiKey,
            autoFetch
        },
        () => {
            // Save large resume text to local storage
            chrome.storage.local.set({ masterResume }, () => {
                if (testSuccess) {
                    showStatus('Settings saved and API Key validated!', 'success');
                } else {
                    showStatus('Settings saved, but API Key test failed!', 'error');
                }
            });
        }
    );
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions(): void {
    // Use default values
    chrome.storage.sync.get(
        {
            notionSecret: '',
            databaseId: '',
            aiProvider: 'gemini',
            aiKey: '',
            autoFetch: true
        },
        async (items) => {
            (document.getElementById('notionSecret') as HTMLInputElement).value = await decryptData(items.notionSecret);
            (document.getElementById('databaseId') as HTMLInputElement).value = items.databaseId;
            (document.getElementById('aiProvider') as HTMLSelectElement).value = items.aiProvider;
            (document.getElementById('aiKey') as HTMLInputElement).value = await decryptData(items.aiKey);
            (document.getElementById('autoFetch') as HTMLInputElement).checked = items.autoFetch;
        }
    );

    // Restore resume from local storage
    chrome.storage.local.get(['masterResume'], (result) => {
        if (result.masterResume) {
            (document.getElementById('masterResume') as HTMLTextAreaElement).value = result.masterResume;
        }
    });
}

function showStatus(message: string, type: string = 'success'): void {
    const status = document.getElementById('status')!;
    status.textContent = message;
    status.className = type;
    status.style.display = 'block';

    setTimeout(() => {
        status.style.display = 'none';
    }, 3000);
}
