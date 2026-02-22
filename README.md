# CareerStack AI - User Walkthrough

## Installation

### From Release (Recommended)
1. Download `extension.zip` from the latest [GitHub Release](https://github.com/musavirchukkan/CareerStack-AI/releases).
2. Unzip the file.
3. Open Chrome and navigate to `chrome://extensions`.
4. Enable **Developer Mode** (toggle in top right).
5. Click **Load Unpacked** and select the unzipped folder.

### From Source
1. Clone the repo and run `npm install && npm run build`.
2. Open Chrome → `chrome://extensions` → Enable **Developer Mode**.
3. Click **Load Unpacked** and select the `dist/` folder.

## Configuration

1. Click the **CareerStack AI** icon in the toolbar.
2. If the popup tells you to configure settings, right-click the icon and select **Options**.
3. **Notion Setup**:
   - create a Notion Integration at [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations).
   - Copy the "Internal Integration Secret".
   - Create a new Database in Notion with the following properties (names are **Case Sensitive**):

     **Auto-filled by extension:**
      - **Company** (Title) -> Stores Company Name
      - **Position** (Text)
      - **Status** (Status) -> Default "Not Applied"
      - **Platform** (Select) -> Options: LinkedIn, Indeed, Other
      - **Application Date** (Date)
      - **Email** (Email)
      - **Source URL** (URL)
      - **Apply Link** (URL)
      - **Salary** (Text)
      - **Match Score** (Number)

     **Optional (managed manually):**
      - **Hiring Manager** (Text)
      - **Interview Date** (Date)
      - **Interview Status** (Multi-select)
      - **Keywords** (Multi-select)
      - **Resume** (Files)
      - **Cover Letter** (Files)
      - **Place** (Text)
   - **Crucial**: Share the database with your integration (Click "..." > "Connect to" > Select your integration).
   - Copy the Database ID from the URL (it's the long string after `notion.so/` and before `?v=`).
4. **AI Setup**:
   - Choose Gemini or OpenAI.
   - Enter your API Key.
5. **Master Resume**:
   - Paste your plain text resume.
6. Click **Save Settings**.

## Usage Guide

1. **Scraping**:
   - Go to a job posting on LinkedIn or Indeed.
   - Click the extension icon.
   - Verify that Company, Position, and Salary are auto-filled.
2. **AI Analysis**:
   - Click **Run AI Analysis**.
   - Wait for the "Match Score" and "Recruiter Email" to populate.
   - Read the summary in the text area.
3. **Saving**:
   - Click **Save to Notion**.
   - Check your Notion database for the new entry.
   - Open the page to see the full Job Description.

## Troubleshooting

- **Detailed Job Description not found**: Ensure you are on the full job details view, not just the list.
- **AI Error**: Check your API Key and quota.
- **Notion Error**: Ensure the database is shared with the integration and property names match exactly.
