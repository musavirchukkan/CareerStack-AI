import * as Sentry from '@sentry/browser';

/**
 * Service to manage Sentry error tracking
 */
export class SentryService {
  private static isInitialized = false;

  /**
   * Initializes Sentry if the DSN is provided and it hasn't been initialized yet.
   */
  static init(): void {
    if (this.isInitialized) return;

    // The DSN should be injected at build time using Vite's env variables.
    // Make sure to add VITE_SENTRY_DSN in your .env file
    const dsn = import.meta.env.VITE_SENTRY_DSN;

    if (!dsn) {
      console.warn('Sentry DSN not found. Error tracking is disabled.');
      return;
    }

    try {
      Sentry.init({
        dsn,
        // Since this is a Chrome extension, we disable default integrations that might cause issues
        // or rely on a standard browser environment.
        integrations: [],
        tracesSampleRate: 1.0,
        // Bypass the browser extension check so we can manually capture errors
        skipBrowserExtensionCheck: true,
        sendDefaultPii: true, // Collect IP automatically
      });
      this.isInitialized = true;
      console.log('Sentry successfully initialized.');
    } catch (e) {
      console.error('Failed to initialize Sentry:', e);
    }
  }

  /**
   * Captures an exception and sends it to Sentry.
   * @param exception The error or exception object to capture
   * @param context Optional additional context/tags for the error
   */
  static captureException(exception: unknown, context?: Record<string, string>): void {
    if (!this.isInitialized) {
      console.error('Captured App Error (Sentry Disabled):', exception);
      return;
    }

    if (context) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
        Sentry.captureException(exception);
      });
    } else {
      Sentry.captureException(exception);
    }
  }

  /**
   * Captures a plain text message.
   * @param message Text to capture
   * @param level Sentry severity level (info, warning, error, etc.)
   */
  static captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
    if (!this.isInitialized) {
      console.log(`Captured App Message (${level}) (Sentry Disabled):`, message);
      return;
    }
    Sentry.captureMessage(message, level);
  }
}
