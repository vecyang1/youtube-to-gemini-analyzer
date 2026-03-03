# YouTube to Gemini Analyzer - Development Notes

## Architecture

### Components

1. **Popup (popup.html/js)**
   - User interface when clicking extension icon
   - Detects if current page is YouTube video
   - Triggers analysis workflow

2. **Background Service Worker (background.js)**
   - Handles messages from popup
   - Stores analysis data in chrome.storage
   - Opens new tab to Google AI Studio

3. **Content Script (content-gemini.js)**
   - Runs on aistudio.google.com pages
   - Retrieves pending analysis from storage
   - Injects video URL and prompt into textarea
   - Auto-clicks Run button
   - Maintains heartbeat during analysis

### Workflow

```
User clicks extension
    ↓
Popup detects YouTube URL
    ↓
Background stores analysis data
    ↓
Background opens AI Studio tab
    ↓
Content script loads on AI Studio
    ↓
Content script retrieves stored data
    ↓
Content script fills textarea
    ↓
Content script clicks Run button
    ↓
Heartbeat keeps session alive
```

## Key Technical Decisions

### Manifest V3
Using Manifest V3 (latest standard) instead of V2:
- Service worker instead of background page
- Improved security and performance
- Future-proof

### Storage API
Using `chrome.storage.local` instead of `chrome.runtime.sendMessage`:
- More reliable for cross-tab communication
- Persists data even if background worker is terminated
- 30-second timeout prevents stale data

### Content Script Injection
Running content script at `document_idle`:
- Ensures DOM is ready
- Better performance than `document_start`

### Angular Form Handling
Multiple event dispatches for Angular forms:
- `input` event for immediate update
- `change` event for form validation
- Custom event with target property for Angular detection

## Potential Improvements

1. **Error Handling**
   - Add retry logic for failed injections
   - Better error messages to user
   - Fallback selectors for UI changes

2. **Configuration**
   - Allow users to customize prompt template
   - Save multiple prompt templates
   - Configure heartbeat interval

3. **Features**
   - Batch analysis of multiple videos
   - Export analysis results
   - Integration with other AI platforms

4. **Performance**
   - Optimize selector queries
   - Reduce storage operations
   - Better memory management

## Known Issues

1. **Selector Brittleness**
   - Google AI Studio UI may change
   - Need to update selectors accordingly
   - Consider using more stable attributes

2. **Timing Issues**
   - Page load timing varies
   - May need longer waits for slow connections
   - Consider exponential backoff

3. **Heartbeat Reliability**
   - Browser may throttle background tabs
   - Consider using chrome.alarms API
   - Add visual indicator for user

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Popup shows correct status on YouTube
- [ ] Popup shows error on non-YouTube pages
- [ ] Background script stores data correctly
- [ ] New tab opens to AI Studio
- [ ] Content script detects pending analysis
- [ ] Textarea fills with correct content
- [ ] Run button clicks successfully
- [ ] Heartbeat maintains connection
- [ ] Analysis completes without timeout

## Version History

### v1.0.0 (2026-03-03)
- Initial release
- One-click YouTube to Gemini analysis
- Auto-paste and auto-submit
- Heartbeat functionality
