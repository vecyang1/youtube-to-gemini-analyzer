# Visual Guide

## Installation Steps

### Step 1: Open Extensions Page
![Chrome Extensions Page](screenshots/step1-extensions.png)
- Navigate to `chrome://extensions/`
- You should see all your installed extensions

### Step 2: Enable Developer Mode
![Enable Developer Mode](screenshots/step2-developer-mode.png)
- Toggle "Developer mode" in top-right corner
- New buttons will appear: "Load unpacked", "Pack extension", "Update"

### Step 3: Load Extension
![Load Unpacked](screenshots/step3-load-unpacked.png)
- Click "Load unpacked" button
- Navigate to the `chrome-extension` folder
- Click "Select" or "Open"

### Step 4: Extension Loaded
![Extension Loaded](screenshots/step4-loaded.png)
- Extension card appears with:
  - Name: "YouTube to Gemini Analyzer"
  - Version: 1.0.0
  - Icon (blue with play buttons)
  - No errors

## Usage Steps

### Step 1: Open YouTube Video
![YouTube Video](screenshots/usage1-youtube.png)
- Navigate to any YouTube video
- Example: https://www.youtube.com/watch?v=7ikJ0HXrmEE

### Step 2: Click Extension Icon
![Extension Popup](screenshots/usage2-popup.png)
- Click the extension icon in toolbar
- Popup shows:
  - "YouTube video detected" (green)
  - Video title
  - "Analyze with Gemini" button (enabled)

### Step 3: Trigger Analysis
![Click Analyze](screenshots/usage3-click.png)
- Click "Analyze with Gemini" button
- Popup shows "Processing..." status

### Step 4: AI Studio Opens
![AI Studio Tab](screenshots/usage4-aistudio.png)
- New tab opens to Google AI Studio
- URL: https://aistudio.google.com/prompts/new_chat

### Step 5: Auto-Fill
![Auto-Fill Prompt](screenshots/usage5-autofill.png)
- Textarea automatically fills with:
  - YouTube video URL
  - Analysis prompt template

### Step 6: Auto-Submit
![Auto-Submit](screenshots/usage6-submit.png)
- Run button clicks automatically
- Analysis starts (loading spinner appears)

### Step 7: Analysis Running
![Analysis Running](screenshots/usage7-running.png)
- Heartbeat keeps session alive
- Progress indicator shows analysis in progress

### Step 8: Results
![Analysis Results](screenshots/usage8-results.png)
- Analysis completes
- Results appear in AI Studio
- Heartbeat stops automatically

## Error States

### Not on YouTube
![Error: Not YouTube](screenshots/error1-not-youtube.png)
- Popup shows: "Please open a YouTube video page" (red)
- Button is disabled

### Not Logged In
![Error: Not Logged In](screenshots/error2-not-logged-in.png)
- AI Studio shows login prompt
- User must log in manually
- Extension will continue after login

### Timeout
![Error: Timeout](screenshots/error3-timeout.png)
- If page takes too long to load
- Console shows timeout error
- User can manually retry

## Console Output

### Successful Flow
```
[YT2Gemini] Content script loaded
[YT2Gemini] Processing analysis for: https://www.youtube.com/watch?v=7ikJ0HXrmEE
[YT2Gemini] Prompt inserted
[YT2Gemini] Clicking run button
[YT2Gemini] Heartbeat - analysis in progress
[YT2Gemini] Heartbeat - analysis in progress
[YT2Gemini] Analysis complete, stopping heartbeat
```

### Error Flow
```
[YT2Gemini] Content script loaded
[YT2Gemini] No pending analysis
```

or

```
[YT2Gemini] Content script loaded
[YT2Gemini] Analysis expired
```

## Developer Tools

### Inspecting Popup
![Inspect Popup](screenshots/dev1-inspect-popup.png)
- Right-click extension icon
- Select "Inspect popup"
- DevTools opens for popup.html

### Inspecting Background Worker
![Inspect Background](screenshots/dev2-inspect-background.png)
- Go to chrome://extensions/
- Find extension
- Click "service worker" link
- DevTools opens for background.js

### Inspecting Content Script
![Inspect Content](screenshots/dev3-inspect-content.png)
- Open AI Studio page
- Press F12 for DevTools
- Console shows content script logs

---

**Note**: Screenshots are placeholders. Take actual screenshots during testing and replace these references.

## Taking Screenshots

Use these keyboard shortcuts:

- **macOS**: Cmd+Shift+4 (select area)
- **Windows**: Win+Shift+S (Snipping Tool)
- **Chrome**: Cmd/Ctrl+Shift+P → "Capture screenshot"

Save screenshots to `screenshots/` folder with descriptive names.
