# YouTube to Gemini Analyzer

A Chrome extension that enables one-click YouTube video analysis with Google AI Studio (Gemini).

## Features

- **One-Click Analysis**: Click the extension icon on any YouTube video page
- **Auto-Navigation**: Automatically opens Google AI Studio in a new tab
- **Auto-Paste**: Inserts the YouTube URL and analysis prompt
- **Auto-Submit**: Automatically starts the analysis
- **Keyboard Shortcuts**: Enter to submit, Cmd+Enter for newline (toggleable in Settings)
- **Custom Prompts**: Save and customize your analysis prompts
- **Analysis History**: Track all your video analyses with timestamps
- **Statistics**: View usage stats and trends
- **Auto Switch Back**: Optionally return to YouTube tab after starting analysis
- **Heartbeat**: Keeps the connection alive during analysis

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder from this project
5. The extension icon should appear in your Chrome toolbar

## Usage

1. Navigate to any YouTube video (e.g., `https://www.youtube.com/watch?v=7ikJ0HXrmEE`)
2. Click the extension icon in your toolbar
3. Click "Analyze with Gemini" button
4. The extension will:
   - Open Google AI Studio in a new tab
   - Paste the video URL and analysis prompt
   - Automatically submit the prompt
   - Keep the session alive with heartbeat

## Analysis Prompt

The extension uses the following analysis template:

```
Extract important info and arguments, speaker, action to do, include as much detail as possible. Output them all.
//Use original language as the context below.

////Combine tone, intonation, and emotional analysis. (integrate inside, don't write separately)
//For key terminology, you can use the original language.
// Summarize the entire text, don't break down by timeline.

//Extract the useful AI prompt if mentioned.
```

## Customization

### Custom Prompts
1. Click the extension icon
2. Go to the "Settings" tab
3. Edit the prompt in the textarea
4. Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to save
5. Or click "Save Prompt" button

### Keyboard Behavior
By default, pressing Enter submits the prompt in Gemini AI Studio, and Cmd+Enter adds a newline.

To switch this behavior:
1. Go to Settings tab
2. Uncheck "Enter to submit" to use Enter for newlines and Cmd+Enter to submit

### Auto Switch Back
Enable "Auto switch back to original tab" in Settings to automatically return to your YouTube tab after starting analysis.

## File Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── content-gemini.js      # Content script for AI Studio
├── keyboard-interceptor.js # Keyboard shortcut handler
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic
└── icons/                 # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Requirements

- Chrome browser (version 88+)
- Google AI Studio account (https://aistudio.google.com)

## Troubleshooting

### Extension doesn't work
- Make sure you're on a YouTube video page (not the homepage)
- Check that the extension is enabled in `chrome://extensions/`
- Open DevTools (F12) and check the Console for errors

### Prompt doesn't auto-submit
- The page might still be loading - wait a few seconds
- Check if you're logged into Google AI Studio
- Try manually clicking the Run button

### Heartbeat not working
- Check browser console for errors
- The heartbeat runs every 5 seconds while analysis is in progress

## License

MIT

## Author

Created: 2026-03-03
