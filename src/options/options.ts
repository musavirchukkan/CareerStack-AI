/**
 * Options Page Script — Settings management for CareerStack extension.
 */

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('options-form')!.addEventListener('submit', saveOptions);
document.getElementById('clearAllCacheBtn')!.addEventListener('click', async () => {
    await chrome.storage.session.clear();
    showStatus('All caches cleared!', 'success');
});

// Save options to chrome.storage
function saveOptions(e: Event): void {
    e.preventDefault();

    const notionSecret = (document.getElementById('notionSecret') as HTMLInputElement).value;
    const databaseId = (document.getElementById('databaseId') as HTMLInputElement).value;
    const aiProvider = (document.getElementById('aiProvider') as HTMLSelectElement).value;
    const aiKey = (document.getElementById('aiKey') as HTMLInputElement).value;
    const autoFetch = (document.getElementById('autoFetch') as HTMLInputElement).checked;
    const masterResume = (document.getElementById('masterResume') as HTMLTextAreaElement).value;

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
                showStatus('Settings saved successfully!', 'success');
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
        (items) => {
            (document.getElementById('notionSecret') as HTMLInputElement).value = items.notionSecret;
            (document.getElementById('databaseId') as HTMLInputElement).value = items.databaseId;
            (document.getElementById('aiProvider') as HTMLSelectElement).value = items.aiProvider;
            (document.getElementById('aiKey') as HTMLInputElement).value = items.aiKey;
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
