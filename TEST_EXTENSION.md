# VidMind Extension Test

## Quick Test Steps

1. **Load Extension**:
   - Open Chrome
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select folder: `./chrome-extension/`

2. **Verify Extension Loaded**:
   - You should see "VidMind - AI Video Analyzer for YouTube" in the list
   - Toggle should be ON (blue)
   - Note the extension ID (looks like: `abcdefghijklmnopqrstuvwxyz`)

3. **Test on YouTube**:
   - Go to any YouTube video (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)
   - Click the VidMind extension icon in toolbar (puzzle piece icon → VidMind)
   - You should see popup with "Ready to analyze" message
   - Click "Analyze with Gemini"

4. **Check Console Logs**:
   - Open DevTools (F12) on YouTube page
   - Go to Console tab
   - You should see `[VidMind]` log messages
   - If you see errors, copy them

5. **Check Background Service Worker**:
   - Go to `chrome://extensions/`
   - Find VidMind
   - Click "service worker" link
   - Console opens - check for errors

## Common Issues

### Extension not showing in toolbar
- Click puzzle piece icon in Chrome toolbar
- Pin VidMind extension

### "Please open a YouTube video page" error
- Make sure you're on a video page (URL has `/watch?v=`)
- Not on YouTube homepage or channel page

### Nothing happens when clicking "Analyze"
- Check background service worker console for errors
- Check if `pendingAnalysis` is being set:
  ```javascript
  chrome.storage.local.get('pendingAnalysis', (data) => console.log(data))
  ```

### Extension disappeared after Chrome restart
- Extensions loaded via "Load unpacked" stay loaded
- If it disappeared, reload it using steps above
