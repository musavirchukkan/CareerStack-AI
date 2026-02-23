import type { RemoteConfig, SelectorConfig } from '../types';
import { CONFIG } from '../config/constants';
import fallbackConfigData from '../config/selectors.json';

const FALLBACK_CONFIG: RemoteConfig = fallbackConfigData as unknown as RemoteConfig;

export class ConfigService {
    /**
     * Gets the current valid configuration.
     * Order of precedence: 
     * 1. Valid local cache (if not expired)
     * 2. Fresh fetch from remote URL
     * 3. Fallback bundled config (if offline/fetch fails AND cache missing)
     */
    static async getSelectors(): Promise<RemoteConfig> {
        try {
            const data = await chrome.storage.local.get([CONFIG.OTA.CACHE_KEY]);
            const cached = data[CONFIG.OTA.CACHE_KEY];

            // If we have a valid cache, return it immediately to avoid blocking, 
            // but trigger a background fetch if it's expired
            if (cached && cached.data && cached.timestamp) {
                const age = Date.now() - cached.timestamp;
                if (age > CONFIG.OTA.CACHE_TTL_MS) {
                    // Cache is stale, fetch in the background without awaiting it
                    // so the immediate scrape isn't slowed down
                    this.fetchAndCache().catch(console.error);
                }
                return cached.data as RemoteConfig;
            }

            // No cache at all? Await a fresh fetch.
            const freshConfig = await this.fetchAndCache();
            if (freshConfig) return freshConfig;

        } catch (error) {
            console.error("Error retrieving config cache:", error);
        }

        // Ultimate fallback
        return FALLBACK_CONFIG;
    }

    /**
     * Re-fetches the remote JSON and updates the chrome.storage.local cache.
     */
    static async fetchAndCache(): Promise<RemoteConfig | null> {
        if (!navigator.onLine) return null;

        try {
            // First try jsDelivr CDN
            let response = await fetch(`${CONFIG.OTA.JSDELIVR_URL}?t=${Date.now()}`);
            
            // Fallback to Gist Array if CDN fails
            if (!response.ok) {
                console.warn(`CDN fetch failed (${response.status}), falling back to Gist...`);
                // We don't cache-bust the gist as heavily, raw gists handle caching differently but we can try
                response = await fetch(`${CONFIG.OTA.GIST_URL}?t=${Date.now()}`);
            }

            // Fallback to GitHub Raw if Gist fails
            if (!response.ok) {
                console.warn(`Gist fetch failed (${response.status}), falling back to GitHub Raw...`);
                response = await fetch(`${CONFIG.OTA.GITHUB_RAW_URL}?t=${Date.now()}`);
            }
            
            if (!response.ok) {
                console.error(`Failed to fetch remote config from all sources`);
                return null;
            }

            const json = await response.json() as RemoteConfig;
            
            // Basic validation: ensure the shape is roughly correct before caching
            if (!json.version || !json.linkedin || !json.indeed) {
                console.warn("Fetched config is malformed.");
                return null;
            }

            // Save to local storage
            await chrome.storage.local.set({
                [CONFIG.OTA.CACHE_KEY]: {
                    data: json,
                    timestamp: Date.now()
                }
            });

            console.log("Successfully updated remote scraper config to version:", json.version);
            return json;

        } catch (error) {
            console.error("Failed to fetch/cache remote config:", error);
            return null;
        }
    }
}
