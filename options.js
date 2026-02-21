document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('options-form').addEventListener('submit', saveOptions);
document.getElementById('clearAllCacheBtn').addEventListener('click', async () => {
    await chrome.storage.session.clear();
    showStatus('All caches cleared!', 'success');
});

// Save options to chrome.storage
function saveOptions(e) {
    e.preventDefault();

    const notionSecret = document.getElementById('notionSecret').value;
    const databaseId = document.getElementById('databaseId').value;
    const aiProvider = document.getElementById('aiProvider').value;
    const aiKey = document.getElementById('aiKey').value;
    const autoFetch = document.getElementById('autoFetch').checked;
    const masterResume = document.getElementById('masterResume').value;

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
function restoreOptions() {
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
            document.getElementById('notionSecret').value = items.notionSecret;
            document.getElementById('databaseId').value = items.databaseId;
            document.getElementById('aiProvider').value = items.aiProvider;
            document.getElementById('aiKey').value = items.aiKey;
            document.getElementById('autoFetch').checked = items.autoFetch;
        }
    );

    // Restore resume from local storage
    chrome.storage.local.get(['masterResume'], (result) => {
        if (result.masterResume) {
            document.getElementById('masterResume').value = result.masterResume;
        }
    });
}

function showStatus(message, type = 'success') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = type;
    status.style.display = 'block';

    setTimeout(() => {
        status.style.display = 'none';
    }, 3000);
}
