# Quick Start Guide

## 5-Minute Setup

### 1. Install Extension (2 minutes)

```bash
# Open Chrome
chrome://extensions/

# Enable Developer Mode (top-right toggle)
# Click "Load unpacked"
# Select this folder:
/Users/vecsatfoxmailcom/Documents/A-coding/26.03.02 yt-to-gemini/chrome-extension
```

### 2. Test It (3 minutes)

1. **Open YouTube video**: https://www.youtube.com/watch?v=7ikJ0HXrmEE
2. **Click extension icon** (puzzle piece → YouTube to Gemini Analyzer)
3. **Click "Analyze with Gemini"**
4. **Watch the magic**:
   - New tab opens to AI Studio
   - Video URL + prompt auto-fills
   - Analysis starts automatically
   - Heartbeat keeps it alive

### 3. Done! 🎉

Your YouTube videos will now auto-analyze with Gemini in one click.

## What Happens Behind the Scenes

```
You click → Extension captures URL → Opens AI Studio →
Fills form → Clicks Run → Keeps session alive → Analysis complete
```

## Customizing the Prompt

Edit `chrome-extension/background.js`:

```javascript
const ANALYSIS_PROMPT = `
Your custom analysis instructions here
`;
```

Then refresh the extension in `chrome://extensions/`

## Troubleshooting

**Extension doesn't load?**
- Check you selected the `chrome-extension` folder
- Look for errors in chrome://extensions/

**Auto-submit doesn't work?**
- Make sure you're logged into Google AI Studio
- Check browser console (F12) for errors
- Try manually clicking Run as fallback

**Need help?**
- Check INSTALLATION.md for detailed steps
- See TESTING_CHECKLIST.md for common issues
- Review DEVELOPMENT.md for technical details

## Next Steps

- Test with different YouTube videos
- Customize the analysis prompt
- Share with friends
- Report issues or suggest features

---

**Created**: 2026-03-03
**Version**: 1.0.0
**Status**: Ready to use
