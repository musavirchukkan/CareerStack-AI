/**
 * Shared utility for retrying async operations with exponential backoff.
 */

export interface RetryOptions {
    /** Max retry attempts (default: 3) */
    maxRetries?: number;
    /** Initial delay in ms (default: 1000) */
    baseDelay?: number;
    /** Multiply delay by this factor each retry (default: 2) */
    backoffFactor?: number;
    /** HTTP status codes that should NOT be retried (e.g., 401, 403) */
    nonRetryableStatuses?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelay: 1000,
    backoffFactor: 2,
    nonRetryableStatuses: [400, 401, 403, 404, 422],
};

/**
 * Wraps a fetch call with retry + exponential backoff.
 * Only retries on network errors and 5xx/429 status codes.
 * Throws immediately on 4xx auth/client errors.
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retryOpts: RetryOptions = {}
): Promise<Response> {
    const config = { ...DEFAULT_OPTIONS, ...retryOpts };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            // Don't retry client errors (auth, bad request, etc.)
            if (config.nonRetryableStatuses.includes(response.status)) {
                return response;
            }

            // Success — return immediately
            if (response.ok) {
                return response;
            }

            // Retryable server error (429, 5xx)
            if (attempt < config.maxRetries) {
                const delay = config.baseDelay * Math.pow(config.backoffFactor, attempt);
                console.warn(`API request failed (${response.status}), retrying in ${delay}ms... (attempt ${attempt + 1}/${config.maxRetries})`);
                await sleep(delay);
                continue;
            }

            // Final attempt failed — return the response for error handling
            return response;

        } catch (error) {
            // Network error (offline, DNS failure, timeout, etc.)
            lastError = error as Error;

            if (attempt < config.maxRetries) {
                const delay = config.baseDelay * Math.pow(config.backoffFactor, attempt);
                console.warn(`Network error, retrying in ${delay}ms... (attempt ${attempt + 1}/${config.maxRetries})`, lastError.message);
                await sleep(delay);
                continue;
            }
        }
    }

    throw lastError || new Error('Request failed after retries');
}

/**
 * Maps common API error responses to user-friendly messages.
 */
export function getReadableError(source: 'AI' | 'Notion', status: number, message?: string): string {
    // Common errors across services
    if (status === 429) return `${source} rate limit reached. Please wait a moment and try again.`;
    if (status >= 500) return `${source} server is temporarily unavailable. Please try again later.`;

    // Service-specific errors
    if (source === 'Notion') {
        if (status === 401) return 'Notion integration secret is invalid. Check your settings in Options.';
        if (status === 403) return 'Notion database is not shared with your integration. Open the database → "..." → "Connect to" → select your integration.';
        if (status === 404) return 'Notion database not found. Check the Database ID in Options.';
        if (status === 400) return `Notion rejected the data: ${message || 'Check that your database properties match the required schema.'}`;
    }

    if (source === 'AI') {
        if (status === 401) return 'AI API key is invalid. Check your key in Options.';
        if (status === 403) return 'AI API key does not have access. Check your billing or quota.';
        if (status === 400) return `AI request was invalid: ${message || 'Unknown error'}`;
    }

    return `${source} error (${status}): ${message || 'Unknown error'}`;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
