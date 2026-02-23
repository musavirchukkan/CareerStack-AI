/**
 * Utility for encrypting and decrypting sensitive data (API keys)
 * before storing them in chrome.storage.sync.
 *
 * Uses the Web Crypto API (AES-GCM) with a securely generated key
 * stored in chrome.storage.local (so it never syncs).
 */

const KEY_STORAGE_NAME = 'encryption_key';
const ENCRYPTION_PREFIX = 'enc::';

export async function getOrCreateKey(): Promise<CryptoKey> {
  const result = await chrome.storage.local.get([KEY_STORAGE_NAME]);
  if (result[KEY_STORAGE_NAME]) {
    // Import existing key
    const rawKey = new Uint8Array(result[KEY_STORAGE_NAME]);
    return await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
  }

  // Generate new key
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);

  // Export and save to local storage
  const exported = await crypto.subtle.exportKey('raw', key);
  await chrome.storage.local.set({ [KEY_STORAGE_NAME]: Array.from(new Uint8Array(exported)) });
  return key;
}

export async function encryptData(text: string): Promise<string> {
  if (!text || text.startsWith(ENCRYPTION_PREFIX)) return text;
  try {
    const key = await getOrCreateKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);

    const encryptedContent = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodedText);

    const encryptedBytes = new Uint8Array(encryptedContent);
    const combined = new Uint8Array(iv.length + encryptedBytes.length);
    combined.set(iv);
    combined.set(encryptedBytes, iv.length);

    // Convert to base64 safely
    const binaryStr = Array.from(combined)
      .map((b) => String.fromCharCode(b))
      .join('');
    return ENCRYPTION_PREFIX + btoa(binaryStr);
  } catch (e) {
    console.error('Encryption failed', e);
    return text;
  }
}

export async function decryptData(encryptedBase64: string): Promise<string> {
  if (!encryptedBase64 || !encryptedBase64.startsWith(ENCRYPTION_PREFIX)) return encryptedBase64;
  try {
    const base64Str = encryptedBase64.substring(ENCRYPTION_PREFIX.length);
    const key = await getOrCreateKey();
    const binaryStr = atob(base64Str);

    const combined = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      combined[i] = binaryStr.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedContent = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);

    return new TextDecoder().decode(decryptedContent);
  } catch (e) {
    console.error('Decryption failed', e);
    return encryptedBase64; // Return as is if decryption fails
  }
}
