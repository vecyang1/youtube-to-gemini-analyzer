# AGENTS.md — VidMind

**Read this file first before touching any code.**

## Project Identity

VidMind is a Chrome extension (Manifest V3, vanilla JS) that automates YouTube video analysis via Google AI Studio (Gemini). Zero build step. Zero dependencies.

## Critical Invariants

### 1. Heuristic Selectors Only
**NEVER hardcode AI Studio DOM selectors.** Google changes them frequently. All element detection must use heuristic scoring: text content, aria-labels, visibility checks, material icon names. See `findHeuristicTextarea()` and `findHeuristicRunButton()` in `content-gemini.js`.

### 2. Angular-Compatible Text Insertion
**NEVER use `textarea.value = "..."` alone.** Angular ignores programmatic value changes. Always try `document.execCommand('insertText')` first, then fall back to native setter + input event dispatch. See content-gemini.js lines 64-71 and 126-134.

### 3. Human-Like Timing
All automation includes randomized delays (`150 + Math.random() * 100`ms). This prevents anti-automation detection and makes interactions more reliable. Do not remove these delays.

### 4. Zero Build Step
No bundlers, no transpilers, no TypeScript. All files are plain JS/CSS/HTML loaded directly by Chrome. This is intentional — keep it this way.

### 5. Storage Split
- `chrome.storage.sync` → user settings (customPrompt, promptLanguage, autoSwitchBack, enterBehavior)
- `chrome.storage.local` → transient data (pendingAnalysis with 30s TTL) + persistent local data (analysisHistory, usageStats)

### 6. i18n Convention
All UI text uses `data-i18n` attributes + `chrome.i18n.getMessage()` with English fallback. Default prompts are centralized in `prompts.js` (not in locale files). Locale files live in `_locales/{en,zh_CN,ja}/messages.json`.

## Architecture Quick Reference

```
popup.html/js  ──message──►  background.js  ──storage──►  content-gemini.js
    (UI)              (service worker)          (AI Studio automation)
                           │
                    keyboard-interceptor.js
                    prompt-modal.js/css
                    prompts.js (shared defaults)
```

**Data flow:** popup → background (via `chrome.runtime.sendMessage`) → storage.local (pendingAnalysis) → content-gemini reads on AI Studio page load.

## Known Gotchas

1. **Clipboard fails when tab not focused** — `navigator.clipboard.writeText()` throws if the AI Studio tab isn't focused. The code handles this with a try/catch fallback to `execCommand`.
2. **Service worker restarts lose tab tracking** — `activeAnalysisTabs` is an in-memory Set. If Chrome terminates the service worker, tracking is lost. Acceptable trade-off.
3. **AI Studio textarea count varies** — Sometimes 2+ textareas are visible. `findHeuristicTextarea()` scores them by placeholder/aria-label relevance.
4. **Run button changes jslog IDs** — Historical values include `250044`, `225921`. Heuristic search catches new values via text/icon matching.

## File Inventory

| File | Lines | Purpose |
|------|-------|---------|
| manifest.json | ~60 | Extension config, permissions, i18n |
| background.js | ~310 | Service worker: messages, tabs, context menu, history, stats |
| content-gemini.js | ~425 | AI Studio automation: fill, submit, heartbeat |
| popup.html | ~315 | Tabbed UI (Analyze/History/Stats/Settings) |
| popup.js | ~290 | Popup logic, settings, tab switching |
| prompts.js | ~38 | Centralized multilingual default prompts |
| prompt-modal.js | ~165 | Custom prompt overlay injected on YouTube |
| prompt-modal.css | ~130 | Modal styles |
| keyboard-interceptor.js | ~100 | Keyboard event handling |
| _locales/*/messages.json | ~40 each | i18n strings (en, zh_CN, ja) |

## PRD Location

`tasks/prd-vidmind.md` — full product requirements document. Keep it updated when features ship.
