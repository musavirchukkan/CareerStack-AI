# Chrome Web Store Auto-Publish Setup

Automate Chrome Web Store uploads via GitHub Actions so that pushing a version tag (e.g., `v2.1.0`) automatically publishes the extension.

## Prerequisites

- Extension must already be published (at least once manually) on Chrome Web Store
- A Google Cloud project with the Chrome Web Store API enabled

---

## Step 1: Google Cloud Console Setup

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**
2. Create a new project (or select existing)
3. Navigate to **APIs & Services → Library**
4. Search for **"Chrome Web Store API"** → **Enable** it
5. Go to **APIs & Services → Credentials**
6. Click **Create Credentials → OAuth Client ID**
   - Application type: **Desktop app**
   - Name: `CareerStack CWS Deploy`
7. Download the credentials — note the **Client ID** and **Client Secret**

## Step 2: Get a Refresh Token

1. Construct the authorization URL by replacing `$YOUR_CLIENT_ID` with the ID you just generated:
   `https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=$YOUR_CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob`
2. Open that URL in your browser, log in with the same Google Account that owns the Developer Dashboard, and grant permission. (Note: Ensure your email is added as a "Test User" on the OAuth consent screen if the app is in Testing mode).
3. Copy the returned **Authorization Code**.
4. Run this curl command in your terminal to generate the refresh token:
   ```bash
   curl "https://accounts.google.com/o/oauth2/token" -d "client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&code=$AUTHORIZATION_CODE&grant_type=authorization_code&redirect_uri=urn:ietf:wg:oauth:2.0:oob"
   ```
5. Extract the **`refresh_token`** string from the JSON response.

## Step 3: Add GitHub Configuration

Go to your repository settings on GitHub → **Settings → Secrets and variables → Actions**

**Create the following as Variables:**
| Variable Name | Value |
|---|---|
| `CHROME_EXTENSION_ID` | Your extension ID (from the Chrome Developer Dashboard URL) |
| `CHROME_CLIENT_ID` | OAuth Client ID from Step 1 |

**Create the following as Repository Secrets:**
| Secret Name | Value |
|---|---|
| `CHROME_CLIENT_SECRET` | OAuth Client Secret from Step 1 |
| `CHROME_REFRESH_TOKEN` | Refresh Token from Step 2 |

## Step 4: Enable the Workflow

The upload automation code is already written in `.github/workflows/semantic-release.yml`. By default, it may be commented out to allow for manual baseline reviews of version 1.

To enable it, simply remove the `#` comments from the `mnao305/chrome-extension-upload` action step at the bottom of the file:

```yaml
- name: 🚀 Upload to Chrome Web Store
  if: steps.release.outputs.released == 'true'
  uses: mnao305/chrome-extension-upload@v5.0.0
  with:
    file-path: extension.zip
    extension-id: ${{ vars.CHROME_EXTENSION_ID }}
    client-id: ${{ vars.CHROME_CLIENT_ID }}
    client-secret: ${{ secrets.CHROME_CLIENT_SECRET }}
    refresh-token: ${{ secrets.CHROME_REFRESH_TOKEN }}
```

## Result

When code is pushed to `main` with a conventional commit that triggers a release (e.g., `feat:` or `fix:`), GitHub Actions will automatically:

1. Bump semantic version
2. Compile Vite build
3. Publish `extension.zip` to GitHub Releases
4. Upload `extension.zip` to the Chrome Web Store Developer Dashboard and submit for review.
