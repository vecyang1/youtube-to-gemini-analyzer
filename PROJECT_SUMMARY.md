# VidMind - AI Video Analyzer for YouTube

## What It Does

A Chrome extension that automates YouTube video analysis with Google AI Studio (Gemini):

1. **One-Click Trigger**: Click extension icon or use keyboard shortcut (Cmd+Shift+A)
2. **Custom Prompt**: Ask any question about a video via Cmd+Shift+X or context menu
3. **Auto-Navigate**: Opens Google AI Studio in new tab
4. **Auto-Paste**: Inserts video URL + analysis prompt
5. **Auto-Submit**: Clicks Run button automatically
6. **Heartbeat**: Keeps session alive during analysis
7. **History & Stats**: Track past analyses with usage statistics
8. **i18n**: Full localization (English, Chinese, Japanese)

## Technical Stack

- **Manifest V3**: Latest Chrome extension standard
- **Vanilla JavaScript**: No frameworks, lightweight
- **Chrome APIs**: storage, tabs, scripting, runtime, contextMenus, notifications
- **Content Scripts**: Injected into aistudio.google.com
- **i18n**: Chrome `_locales` system (en, zh_CN, ja)

## Key Files

```
chrome-extension/
├── manifest.json          # Extension config (permissions, scripts, i18n)
├── background.js          # Service worker (messages, tabs, context menu)
├── content-gemini.js      # AI Studio automation (fills form, clicks button)
├── popup.html/js          # Tabbed UI (Analyze, History, Stats, Settings)
├── prompts.js             # Centralized multilingual default prompts
├── prompt-modal.js/css    # Custom prompt input modal
├── _locales/              # i18n messages (en, zh_CN, ja)
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

Prompts can be customized via **Settings tab** in the popup UI, or by editing `prompts.js` for default templates. Supports per-language defaults (en/zh/ja).

## Architecture Highlights

### Tabbed Popup UI
- 4 tabs: Analyze, History, Stats, Settings
- i18n via `data-i18n` attributes + `chrome.i18n.getMessage()`
- Persistent settings via `chrome.storage.local`

### Storage Strategy
- Uses `chrome.storage.local` for cross-tab communication
- 30-second timeout prevents stale data
- Clears after successful injection
- Stores analysis history and usage stats

### Content Script Injection
- Runs at `document_idle` for DOM readiness
- Waits for textarea with MutationObserver
- Multiple selector fallbacks for robustness

### Angular Form Handling
- Dispatches multiple events (`input`, `change`)
- Custom event with target property for Angular
- Uses `execCommand` keyboard emulation to bypass Angular state constraint bugs

### Heartbeat Mechanism
- Checks every 5 seconds for running analysis
- Simulates user activity (mousemove)
- Stops when analysis completes

### Keyboard Shortcuts & Context Menu
- Cmd+Shift+A: Quick analyze with default prompt
- Cmd+Shift+X: Ask custom question via prompt modal
- Right-click context menu: "Analyze with VidMind"

## Future Enhancements

1. **Batch Processing**
   - Analyze multiple videos
   - Queue management
   - Progress tracking

2. **Export Features**
   - Save analysis results
   - Export to Notion/Markdown

3. **Error Handling**
   - Retry logic
   - Better error messages
   - Fallback mechanisms

## Testing Checklist

- [x] Extension loads without errors
- [x] Manifest.json validates
- [x] Icons generated (16, 48, 128px)
- [x] Popup detects YouTube videos
- [x] Background stores data correctly
- [x] Content script fills textarea
- [x] Auto-submit works
- [x] Heartbeat maintains connection
- [x] i18n messages load per locale
- [ ] Custom prompt modal works end-to-end
- [ ] History tab records analyses
- [ ] Stats tab displays counts correctly
- [ ] Context menu triggers analysis

## Known Limitations

1. **Selector Brittleness**: Google AI Studio UI changes. *(v1.0.1: Added visibility check, dynamic run button detection, `execCommand` keyboard emulation).*
2. **Timing Issues**: Slow connections may need longer waits
3. **Single Video**: No batch processing yet

## Version

- **Current**: v1.1.1
- **Created**: 2026-03-03
- **Last Updated**: 2026-04-07
- **Status**: Production — Chrome Web Store ready

## Changelog

### v1.1.1
- Fixed zh_CN locale JSON parse error (unescaped quotes in settingShortcutHint)

### v1.1.0
- Added tabbed popup UI (Analyze, History, Stats, Settings)
- Added i18n support (English, Chinese, Japanese)
- Added custom prompt modal (Cmd+Shift+X)
- Added context menu integration
- Added centralized multilingual prompts (`prompts.js`)
- Added analysis history tracking
- Added usage statistics
- Hardened keyboard-interceptor.js with heuristic selectors
- Extracted popup CSS to separate file
- Improved error messages in popup

### v1.0.1
- Fixed Angular form state bugs with `execCommand` emulation
- Added visibility checks for multiple textareas
- Updated dynamic run button detection

### v1.0.0
- Initial release: one-click YouTube → Gemini analysis
- Rebranded to VidMind with custom icons
