/**
 * Options Page Script — Settings management for CareerStack extension.
 */
import { encryptData, decryptData } from '../utils/encryption';
import { NotionService } from '../services/NotionService';
import { AIService } from '../services/AIService';


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

    // Test API Keys
    let aiSuccess = false;
    let notionSuccess = false;
    let notionErrorMsg = 'Notion test failed!';

    // Use Promise.all to run both validations in parallel
    const [aiResult, notionResult] = await Promise.allSettled([
        // 1. Test AI Key
        (async () => {
            const isValid = await AIService.verifyKey(aiProvider as 'gemini' | 'openai', aiKeyStr);
            if (!isValid) throw new Error(`${aiProvider} API validation failed`);
            return true;
        })(),

        // 2. Test Notion Credentials & Schema
        (async () => {
            const schemaResult = await NotionService.validateSchema(databaseId, notionSecretStr);
            if (!schemaResult.isConnectionValid) {
                throw new Error(schemaResult.errors[0] || 'Database connection failed');
            }
            if (!schemaResult.isValid) {
                return { success: true, schemaValid: false, errors: schemaResult.errors };
            }
            
            return { success: true, schemaValid: true };
        })()
    ]);

    let notionSchemaValid = false;
    let schemaErrors: string[] = [];

    // Evaluate Results
    if (aiResult.status === 'fulfilled') {
        aiSuccess = true;
    } else {
        console.error('AI validation failed:', aiResult.reason);
    }

    if (notionResult.status === 'fulfilled') {
        notionSuccess = true;
        if (typeof notionResult.value === 'object' && notionResult.value !== null) {
            notionSchemaValid = notionResult.value.schemaValid;
            schemaErrors = notionResult.value.errors || [];
        }
    } else {
        console.error('Notion validation failed:', notionResult.reason);
        notionErrorMsg = `Notion error: ${notionResult.reason.message}`;
    }

    if (saveBtn) { saveBtn.textContent = 'Save Settings'; saveBtn.disabled = false; }

    const notionSecret = await encryptData(notionSecretStr);
    const aiKey = await encryptData(aiKeyStr);

    chrome.storage.sync.set(
        {
            notionSecret,
            databaseId,
            aiProvider,
            aiKey,
            autoFetch,
            aiKeyVerified: aiSuccess,
            notionVerified: notionSuccess,
            schemaVerified: notionSchemaValid
        },
        () => {
            // Save large resume text to local storage
            chrome.storage.local.set({ masterResume }, () => {
                const schemaErrorBox = document.getElementById('schemaErrorBox');
                const schemaErrorList = document.getElementById('schemaErrorList');
                
                if (schemaErrorBox && schemaErrorList) {
                    if (!notionSchemaValid && notionSuccess) {
                        schemaErrorList.innerHTML = schemaErrors.map(e => `<li>${e}</li>`).join('');
                        schemaErrorBox.classList.remove('hidden');
                    } else {
                        schemaErrorBox.classList.add('hidden');
                        schemaErrorList.innerHTML = '';
                    }
                }

                if (aiSuccess && notionSuccess) {
                    document.getElementById('aiKeyStatus')?.classList.remove('hidden');
                    document.getElementById('notionStatus')?.classList.remove('hidden');
                    
                    if (notionSchemaValid) {
                        document.getElementById('schemaStatus')?.classList.remove('hidden');
                    } else {
                        document.getElementById('schemaStatus')?.classList.add('hidden');
                    }
                    
                    if (notionSchemaValid) {
                        showStatus('Settings saved and DB schema verified!', 'success');
                    } else {
                        showStatus('Settings saved but DB schema is invalid!', 'error');
                    }
                } else {
                    if (!aiSuccess) document.getElementById('aiKeyStatus')?.classList.add('hidden');
                    if (!notionSuccess) document.getElementById('notionStatus')?.classList.add('hidden');
                    document.getElementById('schemaStatus')?.classList.add('hidden');
                    
                    if (!aiSuccess && !notionSuccess) {
                        showStatus('Settings saved, but both API tests failed!', 'error');
                    } else if (!notionSuccess) {
                        showStatus(`Settings saved, but ${notionErrorMsg}`, 'error');
                    } else {
                        showStatus('Settings saved, but AI API test failed!', 'error');
                    }
                }
            });
        }
    );
}

function clearAiVerificationBadge(): void {
    document.getElementById('aiKeyStatus')?.classList.add('hidden');
}

function clearNotionVerificationBadge(): void {
    document.getElementById('notionStatus')?.classList.add('hidden');
    document.getElementById('schemaStatus')?.classList.add('hidden');
    document.getElementById('schemaErrorBox')?.classList.add('hidden');
}

// Clear badges if fields are typed in
document.getElementById('aiKey')?.addEventListener('input', clearAiVerificationBadge);
document.getElementById('aiProvider')?.addEventListener('change', clearAiVerificationBadge);

document.getElementById('notionSecret')?.addEventListener('input', clearNotionVerificationBadge);
document.getElementById('databaseId')?.addEventListener('input', clearNotionVerificationBadge);

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions(): void {
    chrome.storage.sync.get(
        {
            notionSecret: '',
            databaseId: '',
            aiProvider: 'gemini',
            aiKey: '',
            autoFetch: true,
            aiKeyVerified: false,
            notionVerified: false,
            schemaVerified: false
        },
        async (items) => {
            (document.getElementById('notionSecret') as HTMLInputElement).value = await decryptData(items.notionSecret);
            (document.getElementById('databaseId') as HTMLInputElement).value = items.databaseId;
            (document.getElementById('aiProvider') as HTMLSelectElement).value = items.aiProvider;
            (document.getElementById('aiKey') as HTMLInputElement).value = await decryptData(items.aiKey);
            (document.getElementById('autoFetch') as HTMLInputElement).checked = items.autoFetch;

            if (items.aiKeyVerified) {
                document.getElementById('aiKeyStatus')?.classList.remove('hidden');
            } else {
                document.getElementById('aiKeyStatus')?.classList.add('hidden');
            }

            if (items.notionVerified) {
                document.getElementById('notionStatus')?.classList.remove('hidden');
            } else {
                document.getElementById('notionStatus')?.classList.add('hidden');
            }
            
            if (items.schemaVerified) {
                document.getElementById('schemaStatus')?.classList.remove('hidden');
            } else {
                document.getElementById('schemaStatus')?.classList.add('hidden');
            }
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
