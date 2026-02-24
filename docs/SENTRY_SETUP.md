# Initializing Sentry for Error Tracking

CareerStack uses Sentry (`@sentry/browser`) to track unhandled exceptions and scraping failures. This helps maintain reliability by capturing issues silently so you can fix broken selectors or code bugs.

Here is your step-by-step guide to setting up your Sentry project and connecting it to the extension.

## 1. Create a Sentry Account & Project

1. Go to [Sentry.io](https://sentry.io/) and sign up or log in.
2. Click **Create Project**.
3. For the platform, select **Browser JavaScript** (or just JavaScript).
4. Set the Default Alert Settings to your preference.
5. Name your project (e.g., `careerstack-extension`) and assign a team.
6. Click **Create Project**.

## 2. Get Your DSN

1. Once the project is created, Sentry will show you configuration instructions.
2. Look for the **DSN** (Data Source Name). It looks like a URL: `https://[key]@[host]/[project_id]`.
3. Copy this URL.

## 3. Configure the Environment Variable

CareerStack uses Vite, which looks for environment variables prefixed with `VITE_`.

1. In the root of the `CareerStack` repository (where `package.json` is located), create a new file named `.env`.
2. Add your DSN to the file like this:

```env
VITE_SENTRY_DSN=your_copied_dsn_url_here
```

_Note: Make sure `.env` is listed in your `.gitignore` (it usually is by default for Vite apps) so you don't commit your DSN directly into the repository._

## 4. Build and Verify

1. Run `npm run build` to package the extension.
2. The `VITE_SENTRY_DSN` will be injected into the built `dist` files.
3. Load the extension in your browser, perform an action or force an error (like misconfiguring a selector), and check your Sentry dashboard to see if the error is logged.

That's it! Sentry will now capture exceptions in both the background service worker and your content scripts.
