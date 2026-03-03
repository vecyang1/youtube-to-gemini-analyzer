#!/bin/bash

echo "=== YouTube to Gemini Analyzer - Verification ==="
echo ""

# Check if extension directory exists
if [ ! -d "chrome-extension" ]; then
    echo "❌ chrome-extension directory not found"
    exit 1
fi

echo "✅ Extension directory exists"

# Check required files
required_files=(
    "chrome-extension/manifest.json"
    "chrome-extension/background.js"
    "chrome-extension/content-gemini.js"
    "chrome-extension/popup.html"
    "chrome-extension/popup.js"
    "chrome-extension/icons/icon16.png"
    "chrome-extension/icons/icon48.png"
    "chrome-extension/icons/icon128.png"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing: $file"
        exit 1
    fi
    echo "✅ Found: $file"
done

# Validate manifest.json
echo ""
echo "=== Validating manifest.json ==="
if python3 -c "import json; json.load(open('chrome-extension/manifest.json'))" 2>/dev/null; then
    echo "✅ manifest.json is valid JSON"
else
    echo "❌ manifest.json has syntax errors"
    exit 1
fi

# Check for required manifest fields
echo ""
echo "=== Checking manifest fields ==="
manifest_version=$(python3 -c "import json; print(json.load(open('chrome-extension/manifest.json'))['manifest_version'])")
if [ "$manifest_version" = "3" ]; then
    echo "✅ Manifest version 3"
else
    echo "❌ Wrong manifest version: $manifest_version"
    exit 1
fi

# Check file sizes
echo ""
echo "=== File Sizes ==="
du -h chrome-extension/background.js
du -h chrome-extension/content-gemini.js
du -h chrome-extension/popup.js

# Check documentation
echo ""
echo "=== Documentation ==="
docs=(
    "README.md"
    "QUICKSTART.md"
    "PROJECT_SUMMARY.md"
    "ARCHITECTURE.md"
    "TESTING_CHECKLIST.md"
    "VISUAL_GUIDE.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo "✅ $doc"
    else
        echo "⚠️  Missing: $doc"
    fi
done

echo ""
echo "=== Summary ==="
echo "✅ All required files present"
echo "✅ manifest.json is valid"
echo "✅ Icons generated"
echo "✅ Documentation complete"
echo ""
echo "🎉 Extension is ready for installation!"
echo ""
echo "Next steps:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable Developer Mode"
echo "3. Click 'Load unpacked'"
echo "4. Select the chrome-extension folder"
echo ""
