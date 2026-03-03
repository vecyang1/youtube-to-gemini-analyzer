# Testing Checklist

## Pre-Installation Tests

- [x] All files created
- [x] manifest.json validates
- [x] Icons generated (16, 48, 128px)
- [x] No syntax errors in JavaScript files

## Installation Tests

- [ ] Extension loads in Chrome without errors
- [ ] Extension appears in chrome://extensions/
- [ ] No manifest errors shown
- [ ] Extension icon appears in toolbar (after pinning)

## Popup Tests

### On YouTube Video Page
- [ ] Open https://www.youtube.com/watch?v=7ikJ0HXrmEE
- [ ] Click extension icon
- [ ] Popup shows "YouTube video detected" (green status)
- [ ] Video title appears in popup
- [ ] "Analyze with Gemini" button is enabled

### On Non-YouTube Page
- [ ] Open any non-YouTube page (e.g., google.com)
- [ ] Click extension icon
- [ ] Popup shows "Please open a YouTube video page" (red status)
- [ ] "Analyze with Gemini" button is disabled

## Background Worker Tests

- [ ] Click "Analyze with Gemini" on YouTube page
- [ ] New tab opens to https://aistudio.google.com/prompts/new_chat
- [ ] Original tab remains open
- [ ] No console errors in background worker

## Content Script Tests

### Page Load
- [ ] Content script loads on AI Studio page
- [ ] Console shows "[YT2Gemini] Content script loaded"
- [ ] No JavaScript errors

### Data Retrieval
- [ ] Content script retrieves stored analysis data
- [ ] Console shows "[YT2Gemini] Processing analysis for: [URL]"
- [ ] Data is within 30-second timeout

### Form Filling
- [ ] Textarea is found and filled
- [ ] Video URL appears in textarea
- [ ] Analysis prompt appears below URL
- [ ] Console shows "[YT2Gemini] Prompt inserted"

### Auto-Submit
- [ ] Run button is found
- [ ] Run button is clicked automatically
- [ ] Console shows "[YT2Gemini] Clicking run button"
- [ ] Analysis starts (loading spinner appears)

### Heartbeat
- [ ] Heartbeat starts after submission
- [ ] Console shows "[YT2Gemini] Heartbeat - analysis in progress" every 5 seconds
- [ ] Heartbeat stops when analysis completes
- [ ] Console shows "[YT2Gemini] Analysis complete, stopping heartbeat"

## Edge Cases

### Multiple Videos
- [ ] Test with different YouTube videos
- [ ] Each video URL is correctly captured
- [ ] No data leakage between analyses

### Slow Connection
- [ ] Test with throttled network (Chrome DevTools)
- [ ] Content script waits for page load
- [ ] Timeout handling works correctly

### Already Open AI Studio Tab
- [ ] Open AI Studio manually
- [ ] Trigger extension from YouTube
- [ ] New tab still opens (doesn't reuse existing)

### Expired Data
- [ ] Store analysis data
- [ ] Wait 31+ seconds
- [ ] Open AI Studio manually
- [ ] Content script ignores expired data

## Error Scenarios

### Textarea Not Found
- [ ] Simulate missing textarea (modify page)
- [ ] Check console for error message
- [ ] Extension doesn't crash

### Run Button Not Found
- [ ] Simulate missing button (modify page)
- [ ] Check console for error message
- [ ] Extension doesn't crash

### Not Logged In
- [ ] Log out of Google AI Studio
- [ ] Trigger extension
- [ ] Check if login prompt appears
- [ ] Manual login allows continuation

## Performance Tests

- [ ] Extension loads quickly (<1s)
- [ ] Popup opens instantly
- [ ] Tab opens without delay
- [ ] Form filling is fast (<2s)
- [ ] No memory leaks (check Task Manager)

## Browser Compatibility

- [ ] Chrome (latest version)
- [ ] Chrome (one version back)
- [ ] Edge (Chromium-based)

## Clean Up Tests

- [ ] Storage is cleared after successful injection
- [ ] No orphaned data in chrome.storage
- [ ] Heartbeat stops properly
- [ ] No lingering intervals/timers

## User Experience

- [ ] Clear status messages in popup
- [ ] Smooth transitions between states
- [ ] No unexpected behavior
- [ ] Intuitive workflow

## Documentation Tests

- [ ] README.md is clear and accurate
- [ ] INSTALLATION.md steps work
- [ ] DEVELOPMENT.md is helpful for developers
- [ ] All file paths are correct

## Final Verification

- [ ] Extension works end-to-end
- [ ] No console errors
- [ ] Analysis completes successfully
- [ ] Results appear in AI Studio
- [ ] Ready for production use

## Notes

Record any issues found:

1. Issue: _______________
   Solution: _______________

2. Issue: _______________
   Solution: _______________

3. Issue: _______________
   Solution: _______________
