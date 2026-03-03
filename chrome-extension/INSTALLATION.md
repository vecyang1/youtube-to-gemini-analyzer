# Installation Guide

## Step 1: Open Chrome Extensions

1. Open Google Chrome
2. Type `chrome://extensions/` in the address bar
3. Press Enter

## Step 2: Enable Developer Mode

1. Look for the "Developer mode" toggle in the top-right corner
2. Click to enable it (it should turn blue/on)

## Step 3: Load the Extension

1. Click the "Load unpacked" button (appears after enabling Developer mode)
2. Navigate to this folder: `/Users/vecsatfoxmailcom/Documents/A-coding/26.03.02 yt-to-gemini/chrome-extension`
3. Click "Select" or "Open"

## Step 4: Verify Installation

You should see:
- Extension card with "YouTube to Gemini Analyzer" title
- Version 1.0.0
- Blue/green icon
- No errors

## Step 5: Pin the Extension (Optional)

1. Click the puzzle piece icon in Chrome toolbar
2. Find "YouTube to Gemini Analyzer"
3. Click the pin icon to keep it visible

## Usage

1. Go to any YouTube video (e.g., https://www.youtube.com/watch?v=7ikJ0HXrmEE)
2. Click the extension icon
3. Click "Analyze with Gemini"
4. Wait for Google AI Studio to open and auto-submit

## Troubleshooting

### "Manifest file is missing or unreadable"
- Make sure you selected the `chrome-extension` folder, not the parent folder
- Check that `manifest.json` exists in the folder

### "Invalid manifest"
- Run validation: `python3 -c "import json; json.load(open('manifest.json'))"`
- Check for syntax errors in manifest.json

### Extension loads but doesn't work
- Open DevTools (F12) on the YouTube page
- Check Console for errors
- Make sure you're logged into Google AI Studio

### Auto-submit doesn't work
- The AI Studio page might have changed
- Check browser console for selector errors
- Try manually clicking Run button as fallback

## Updating the Extension

After making changes to the code:

1. Go to `chrome://extensions/`
2. Find "YouTube to Gemini Analyzer"
3. Click the refresh icon (circular arrow)
4. Test the changes

## Uninstalling

1. Go to `chrome://extensions/`
2. Find "YouTube to Gemini Analyzer"
3. Click "Remove"
4. Confirm removal
