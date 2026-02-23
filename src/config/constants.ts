/**
 * Global Constants & Environment Configurations
 * 
 * Centralized configuration for all URLs, API endpoints, model names,
 * and cache timings used throughout the extension.
 */

export const CONFIG = {
    // ─── API & Models ───────────────────────────────────────────────
    AI: {
        GEMINI: {
            ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models',
            DEFAULT_MODEL: 'gemini-flash-latest'
        },
        OPENAI: {
            ENDPOINT: 'https://api.openai.com/v1/chat/completions',
            VERIFY_ENDPOINT: 'https://api.openai.com/v1/models',
            DEFAULT_MODEL: 'gpt-4o-mini'
        }
    },
    NOTION: {
        API_VERSION: '2022-06-28',
        BASE_URL: 'https://api.notion.com/v1'
    },

    // ─── Over-the-Air Configurations ────────────────────────────────
    OTA: {
        // Primary CDN: Global caching via jsDelivr
        JSDELIVR_URL: 'https://cdn.jsdelivr.net/gh/musavirchukkan/CareerStack-AI@main/src/config/selectors.json',
        // Secondary Fallback: Gist URL (User must configure secret to auto-update)
        GIST_URL: 'https://gist.github.com/musavirchukkan/018a11ff4c1c779a157377c1ca2c6bcb/raw/selectors.json',
        // Tertiary Fallback: Direct GitHub Raw in case CDN is down or caching aggressively
        GITHUB_RAW_URL: 'https://raw.githubusercontent.com/musavirchukkan/CareerStack-AI/main/src/config/selectors.json',
        
        CACHE_KEY: 'scrapers_config',
        CACHE_TTL_MS: 6 * 60 * 60 * 1000 // 6 hours
    },

    // ─── Extension Timings ──────────────────────────────────────────
    UI: {
        SUCCESS_MSG_DURATION: 4000,
        ERROR_MSG_DURATION: 6000,
        BUTTON_COOLDOWN: 2000
    }
} as const;
