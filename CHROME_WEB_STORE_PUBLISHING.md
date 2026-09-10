# Publishing VidMind to Chrome Web Store

## Quick Publishing Steps

### 1. Prepare Package
```bash
cd chrome-extension
zip -r vidmind-v1.0.0.zip . -x "*.DS_Store" -x "__MACOSX/*"
```

### 2. Chrome Web Store Setup
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay one-time $5 developer registration fee
3. Click "New Item" → Upload `vidmind-v1.0.0.zip`

### 3. Required Assets
Create these before submission:
- **Icon**: 128x128px (already have in `icons/`)
- **Screenshots**: 1280x800px or 640x400px (3-5 images showing the extension in action)
  - Save to: `marketing/images/`
- **Promotional tile**: 440x280px (optional but recommended)
- **Privacy policy URL** (required if using permissions)

### 4. Store Listing Info
Fill in:
- **Name**: VidMind - AI Video Analyzer for YouTube
- **Summary**: One-click AI-powered YouTube video analysis with Google Gemini
- **Description**: Expand from README.md
- **Category**: Productivity
- **Language**: English

### 5. Privacy Requirements
Since you use `storage`, `tabs`, `notifications` permissions, you need:
- Privacy policy explaining data usage
- Declare that no user data is collected/transmitted (if true)

### 6. Submit for Review
- Review time: 1-3 days typically
- They'll check permissions match functionality
- May ask for justification of `host_permissions`

## Current Status
- Extension version: 1.0.0
- Manifest: v3 (latest)
- Icons: Ready (16px, 48px, 128px)
- Code: Clean, no credentials

## Next Steps
1. Create screenshots in `marketing/images/`
2. Write privacy policy
3. Create promotional assets
4. Package and upload
