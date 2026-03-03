# YouTube to Gemini Analyzer - Project Summary

## What It Does

A Chrome extension that automates YouTube video analysis with Google AI Studio (Gemini):

1. **One-Click Trigger**: Click extension icon on any YouTube video page
2. **Auto-Navigate**: Opens Google AI Studio in new tab
3. **Auto-Paste**: Inserts video URL + analysis prompt
4. **Auto-Submit**: Clicks Run button automatically
5. **Heartbeat**: Keeps session alive during analysis

## Technical Stack

- **Manifest V3**: Latest Chrome extension standard
- **Vanilla JavaScript**: No frameworks, lightweight
- **Chrome APIs**: storage, tabs, scripting, runtime
- **Content Scripts**: Injected into aistudio.google.com

## Key Files

```
chrome-extension/
├── manifest.json          # Extension config (permissions, scripts)
├── background.js          # Service worker (handles messages, opens tabs)
├── content-gemini.js      # AI Studio automation (fills form, clicks button)
├── popup.html/js          # User interface (extension icon popup)
├── icons/                 # Extension icons (16, 48, 128px)
└── README.md              # User documentation
```

## Installation

```bash
# 1. Open Chrome
chrome://extensions/

# 2. Enable Developer Mode (top-right toggle)

# 3. Click "Load unpacked"

# 4. Select folder:
/Users/vecsatfoxmailcom/Documents/A-coding/26.03.02 yt-to-gemini/chrome-extension
```

## Usage Flow

```
YouTube Video Page
    ↓ (user clicks extension)
Extension Popup
    ↓ (detects video URL)
Background Worker
    ↓ (stores data + opens tab)
Google AI Studio
    ↓ (content script loads)
Auto-Fill Textarea
    ↓ (video URL + prompt)
Auto-Click Run Button
    ↓ (starts analysis)
Heartbeat Active
    ↓ (keeps session alive)
Analysis Complete
```

## Analysis Prompt Template

```
各自提取 important info and aruguments, speaker,action to do, include as much as detail. Output them all.
//use original langauge as the context below.

////Combine tone, intonation, and emotional analysis. (integrate inside, don't write seperately)
//针对关键术语 可用原语言的.
// 综述全文,不要break down by timeline.

//Extract the useful AI prompt if mentioned.
```

## Customization

To change the prompt, edit `background.js`:

```javascript
const ANALYSIS_PROMPT = `your custom prompt here`;
```

## Architecture Highlights

### Storage Strategy
- Uses `chrome.storage.local` for cross-tab communication
- 30-second timeout prevents stale data
- Clears after successful injection

### Content Script Injection
- Runs at `document_idle` for DOM readiness
- Waits for textarea with MutationObserver
- Multiple selector fallbacks for robustness

### Angular Form Handling
- Dispatches multiple events (`input`, `change`)
- Custom event with target property for Angular
- Triggers form validation and update

### Heartbeat Mechanism
- Checks every 5 seconds for running analysis
- Simulates user activity (mousemove)
- Stops when analysis completes

## Future Enhancements

1. **Configuration UI**
   - Custom prompt templates
   - Multiple saved prompts
   - Heartbeat interval settings

2. **Batch Processing**
   - Analyze multiple videos
   - Queue management
   - Progress tracking

3. **Export Features**
   - Save analysis results
   - Export to Notion/Markdown
   - History tracking

4. **Error Handling**
   - Retry logic
   - Better error messages
   - Fallback mechanisms

## Testing Checklist

- [x] Extension loads without errors
- [x] Manifest.json validates
- [x] Icons generated (16, 48, 128px)
- [ ] Popup detects YouTube videos
- [ ] Background stores data correctly
- [ ] Content script fills textarea
- [ ] Auto-submit works
- [ ] Heartbeat maintains connection

## Known Limitations

1. **Selector Brittleness**: Google AI Studio UI may change
2. **Timing Issues**: Slow connections may need longer waits
3. **Single Video**: No batch processing yet
4. **No History**: Analysis results not saved

## Version

- **Current**: v1.0.0
- **Created**: 2026-03-03
- **Status**: Ready for testing

## Next Steps

1. Load extension in Chrome
2. Test on YouTube video
3. Verify auto-submission works
4. Monitor console for errors
5. Iterate based on feedback
