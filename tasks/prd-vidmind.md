# PRD: VidMind - AI Video Analyzer for YouTube

**Version:** 1.1.0
**Created:** 2026-03-03
**Updated:** 2026-04-07
**Status:** Active Development

---

## PART A: Context & Direction

### 1. Introduction/Overview

VidMind is a Chrome extension that automates YouTube video analysis through Google AI Studio (Gemini). Users click one button (or press a keyboard shortcut) on any YouTube video page; VidMind opens AI Studio, pastes the video URL plus an analysis prompt, clicks "Run," and keeps the session alive until analysis completes. The extension supports multiple languages, custom prompts, analysis history, and usage statistics.

**Problem:** Manually copying YouTube URLs into AI Studio, writing prompts, and babysitting the session is repetitive and error-prone. VidMind reduces this to a single action.

### 2. Goals

- One-action video analysis from any YouTube page (click, shortcut, or context menu)
- Seamless AI Studio automation that survives Angular UI changes via heuristic selectors
- Multilingual support (English, Chinese, Japanese) for both UI and default prompts
- Persistent analysis history and usage stats for personal productivity tracking
- Custom prompt support for different analysis needs per video
- Chrome Web Store publishable quality

### 3. User Stories

#### US-001: One-Click Default Analysis
**Description:** As a YouTube viewer, I want to analyze the current video with one click so that I get a detailed summary without manual copy-paste.
**Acceptance Criteria:**
- [ ] Clicking the extension icon on a YouTube page shows the popup with "Analyze with Gemini" button enabled
- [ ] Clicking "Analyze" opens AI Studio in a new tab adjacent to the current tab
- [ ] Video URL is pasted and default prompt is appended automatically
- [ ] Run button is clicked automatically after prompt insertion
- [ ] Heartbeat keeps the session alive until analysis completes
- [ ] Notification fires when analysis finishes
- [ ] Typecheck/lint passes

#### US-002: Keyboard Shortcut Analysis
**Description:** As a power user, I want to trigger analysis via Cmd+Shift+A without opening the popup so that my workflow stays fast.
**Acceptance Criteria:**
- [ ] Cmd+Shift+A (Mac) / Ctrl+Shift+A (Windows) triggers analysis on current YouTube tab
- [ ] Works without opening the popup
- [ ] Same automation flow as US-001
- [ ] Shortcut is customizable via chrome://extensions/shortcuts
- [ ] Typecheck/lint passes

#### US-003: Custom Prompt via Modal
**Description:** As a researcher, I want to ask a specific question about a video so that I get targeted analysis instead of a generic summary.
**Acceptance Criteria:**
- [ ] Cmd+Shift+X injects a prompt modal overlay on the YouTube page
- [ ] User types a custom question and presses Enter or clicks Submit
- [ ] The custom prompt replaces the default prompt for this analysis
- [ ] Modal dismisses on Escape or clicking outside
- [ ] Typecheck/lint passes

#### US-004: Context Menu Analysis
**Description:** As a user browsing YouTube, I want to right-click a video link and analyze it without navigating to the video first.
**Acceptance Criteria:**
- [ ] Right-clicking a YouTube link shows "Analyze with VidMind" in context menu
- [ ] Works with youtube.com/watch, youtu.be, and m.youtube.com links
- [ ] Short links (youtu.be) are normalized to full URLs
- [ ] Analysis starts immediately using the default prompt
- [ ] Typecheck/lint passes

#### US-005: i18n / Language Selection
**Description:** As a non-English speaker, I want the extension UI and default prompts in my language so that I can use VidMind comfortably.
**Acceptance Criteria:**
- [ ] Extension name and description localized (en, zh_CN, ja)
- [ ] All popup UI text uses `chrome.i18n.getMessage()` via `data-i18n` attributes
- [ ] Output language selector in Settings changes the default analysis prompt language
- [ ] Language preference persists across sessions via `chrome.storage.sync`
- [ ] Typecheck/lint passes

#### US-006: Analysis History
**Description:** As a frequent user, I want to see my past analyses so that I can revisit or track what I've analyzed.
**Acceptance Criteria:**
- [ ] History tab shows recent analyses with video title, timestamp, and status
- [ ] Running analyses show "running" badge; completed show "completed" with duration
- [ ] History is capped at 100 entries (FIFO)
- [ ] "Clear History" button with confirmation dialog
- [ ] Empty state message when no history exists
- [ ] Typecheck/lint passes

#### US-007: Usage Statistics
**Description:** As a user, I want to see how many videos I've analyzed so that I can track my usage.
**Acceptance Criteria:**
- [ ] Stats tab shows: Total Analyses, Today's count, First Use date
- [ ] Daily usage tracked by ISO date key
- [ ] Stats persist across sessions
- [ ] Typecheck/lint passes

#### US-008: Settings & Configuration
**Description:** As a user, I want to configure the extension behavior (prompt, shortcuts, auto-switch) so that it fits my workflow.
**Acceptance Criteria:**
- [ ] Custom prompt textarea with Cmd+Enter to save
- [ ] Reset to Default button restores language-specific default prompt
- [ ] Output Language dropdown (en/zh/ja) changes default prompt
- [ ] Auto-switch-back toggle (return to YouTube tab after starting analysis)
- [ ] Enter-to-submit toggle (Enter submits vs newline)
- [ ] Keyboard shortcuts displayed with "Customize" link to chrome://extensions/shortcuts
- [ ] All settings persist via `chrome.storage.sync`
- [ ] Typecheck/lint passes

### 4. Functional Requirements

- **FR-01:** Extension must use Manifest V3 with `activeTab`, `scripting`, `storage`, `tabs`, `notifications`, `contextMenus` permissions
- **FR-02:** Content script (`content-gemini.js`) must run on `aistudio.google.com` at `document_idle`
- **FR-03:** Textarea detection must use heuristic scoring (placeholder, aria-label, formcontrolname) — not hardcoded selectors
- **FR-04:** Text insertion must use `document.execCommand('insertText')` first, falling back to native value setter + input event dispatch for Angular compatibility
- **FR-05:** Run button detection must use heuristic search (text content, aria-label, material icon names) — not hardcoded `jslog` values
- **FR-06:** Pending analysis data stored in `chrome.storage.local` with 30-second TTL
- **FR-07:** Settings (customPrompt, promptLanguage, autoSwitchBack, enterBehavior) stored in `chrome.storage.sync`
- **FR-08:** History stored in `chrome.storage.local`, capped at 100 entries
- **FR-09:** Heartbeat runs every 2 seconds: simulates mousemove, scroll, textarea focus, and requestAnimationFrame
- **FR-10:** Heartbeat stops when neither a "Stop" button nor a spinner is detected (heuristic completion detection)
- **FR-11:** Background service worker keeps analysis tabs alive via 3-second keepalive ping loop
- **FR-12:** New AI Studio tab opens adjacent to current tab (not at end of tab bar)
- **FR-13:** Context menu only appears on YouTube link patterns (`youtube.com/watch`, `youtu.be`, `m.youtube.com`)
- **FR-14:** youtu.be and m.youtube.com URLs normalized to `www.youtube.com/watch?v=` format
- **FR-15:** Desktop notification fires when analysis completes (via `chrome.notifications`)
- **FR-16:** All UI strings use `chrome.i18n.getMessage()` with fallback to English hardcoded defaults

### 5. Non-Goals (Out of Scope)

- Batch processing of multiple videos
- Exporting analysis results (copy/save/Notion)
- User accounts or cloud sync
- Support for non-YouTube video platforms
- Support for AI providers other than Google AI Studio
- Mobile browser support
- Automatic retry on failure
- Prompt template library / marketplace

---

## PART B: Stack & Safety

### 6. Stack & Dependencies

#### 6.1 Research Methodology
No external dependencies needed — VidMind is a pure Chrome extension using only browser-native APIs.

#### 6.2 Dependency Table

| Dependency | Version | Purpose | Why this one? |
|-----------|---------|---------|---------------|
| Chrome Manifest V3 | 3 | Extension framework | Chrome standard, required |
| chrome.storage API | - | Settings + history persistence | Built-in, no alternatives |
| chrome.i18n API | - | Localization | Chrome native i18n system |
| chrome.contextMenus | - | Right-click menu | Chrome native API |
| chrome.notifications | - | Completion alerts | Chrome native API |
| chrome.commands | - | Keyboard shortcuts | Chrome native API |

**Rejected alternatives:**
- React/Vue/Svelte for popup: Rejected — adds build step, bundle size, and complexity for a simple 4-tab UI
- i18next for i18n: Rejected — Chrome's native `_locales` system is sufficient and has zero overhead
- IndexedDB for history: Rejected — `chrome.storage.local` handles 100 entries easily; no query needs

#### 6.3 Backend Decision
**No backend needed.** All data is local (`chrome.storage.local` for history/stats, `chrome.storage.sync` for settings). No user accounts, no shared state, no server-side processing.

### 7. Safety & Security

#### 7.1 Zero-Regression Contract

| Existing Feature | Files Touched | Risk | Verification |
|-----------------|---------------|------|-------------|
| Default analysis flow | content-gemini.js, background.js | HIGH | Manual test: click Analyze on YouTube → AI Studio fills and runs |
| Keyboard shortcut (Cmd+Shift+A) | background.js | MEDIUM | Test shortcut on YouTube page |
| Popup displays video info | popup.js, popup.html | MEDIUM | Open popup on YouTube page, verify title shown |
| Settings persistence | popup.js | LOW | Save prompt → close popup → reopen → verify saved |

#### 7.2 Security Hardening

| Attack Surface | Threat | Mitigation |
|---------------|--------|-----------|
| Content script injection on aistudio.google.com | XSS via crafted video URL | URL parsed via `new URL()` — no raw string interpolation |
| chrome.storage data | Extension compromise reads history | History contains only video IDs/titles — no credentials |
| Context menu link handling | Malicious URL injection | Only triggers on YouTube URL patterns; URLs normalized via `new URL()` |
| Prompt injection via custom prompt | User-supplied prompt could contain AI jailbreak | Not a security issue — user controls their own prompts |

#### 7.3 Error Boundaries

| Component | Failure Mode | User Experience | Recovery |
|-----------|-------------|-----------------|----------|
| Textarea not found | AI Studio UI changed | Console error, no action | Heuristic search tries 30 attempts over 15s |
| Run button not found | AI Studio UI changed | Console error, prompt filled but not submitted | User can manually click Run |
| Clipboard write fails | Tab not focused | Falls back to `execCommand` insertion | Automatic fallback |
| Tab creation fails | Chrome internal error | Error status in popup | User retries |
| Storage quota exceeded | 100+ history entries | Oldest entries dropped (FIFO) | Automatic via splice |

---

## PART C: Audience & Architecture

### 8. UI/UX Architecture

#### 8.1 Audience Map

| Audience | Description | Primary Goal | Entry Point |
|---------|-------------|-------------|-------------|
| Casual Viewer | Watches YouTube for learning/entertainment | Quick video summary | Extension icon click |
| Power User | Analyzes many videos daily | Fast shortcut-driven workflow | Cmd+Shift+A / Cmd+Shift+X |
| Researcher | Deep-dives specific topics | Custom question about video | Custom prompt modal or Settings |

#### 8.2 Audience-Page Matrix

| View | Primary Audience | Job |
|------|-----------------|-----|
| Analyze tab | Casual Viewer | One-click analysis |
| History tab | Power User | Track past analyses |
| Stats tab | Power User | Monitor usage |
| Settings tab | Researcher / Power User | Configure prompts and behavior |
| Prompt modal (overlay) | Researcher | Ask specific question |

#### 8.4 Page/View Inventory

| View | Type | Parent | Purpose |
|------|------|--------|---------|
| Popup | popup window | Chrome toolbar | Main extension interface |
| Analyze tab | tab view | Popup | Trigger analysis |
| History tab | tab view | Popup | View past analyses |
| Stats tab | tab view | Popup | View usage statistics |
| Settings tab | tab view | Popup | Configure extension |
| Prompt modal | overlay | YouTube page | Custom prompt input |

#### 8.5 Navigation Model

```
Chrome toolbar icon ──[click]──► Popup (Analyze tab active)
Popup tabs ──[click tab]──► Switch between Analyze/History/Stats/Settings
Settings > Customize ──[click]──► chrome://extensions/shortcuts (new tab)
Cmd+Shift+A ──[shortcut]──► Direct analysis (no popup)
Cmd+Shift+X ──[shortcut]──► Prompt modal overlay on YouTube page
Right-click YT link ──[context menu]──► Direct analysis (no popup)
```

#### 8.8 View States

| View | State | Trigger | Display |
|------|-------|---------|---------|
| Analyze tab | not-youtube | Non-YouTube tab active | Disabled button, error status |
| Analyze tab | ready | YouTube video tab active | Enabled button, video title shown |
| Analyze tab | starting | User clicks Analyze | Disabled button, "Starting..." status |
| Analyze tab | success | Analysis initiated | Success status, popup closes after 800ms |
| History tab | empty | No history | "No analysis history yet" centered text |
| History tab | populated | Has history | List of history items with status badges |
| Stats tab | zero | First visit | All zeros, first use shows "-" |
| Stats tab | populated | Has stats | Numbers and date displayed |
| Prompt modal | open | Cmd+Shift+X | Overlay with textarea and submit button |
| Prompt modal | closed | Escape / click outside / submit | Modal removed from DOM |

---

## PART D: Design & Presentation

### 9. Design System

#### 9.1 Visual Philosophy
Clean, minimal Google Material-inspired design. Matches Chrome's native extension popup aesthetic. Reference: Google Keep popup, Google Translate popup.

#### 9.2 Color Palette

| Token | Light | Usage |
|-------|-------|-------|
| Primary | `#1a73e8` | Buttons, active tab, stat values |
| Primary hover | `#1765cc` | Button hover state |
| Disabled | `#dadce0` | Disabled buttons, borders |
| Text primary | `#202124` | Headings, titles |
| Text secondary | `#5f6368` | Labels, descriptions, metadata |
| Background | `#ffffff` | Page background |
| Surface | `#f8f9fa` | Cards, info boxes, shortcut boxes |
| Success bg | `#e6f4ea` | Success status |
| Success text | `#137333` | Success status text |
| Info bg | `#e8f0fe` | Info status, running badge |
| Info text | `#1967d2` | Info status text |
| Error bg | `#fce8e6` | Error status |
| Error text | `#c5221f` | Error status text |

#### 9.3 Typography

| Style | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| Title | System (-apple-system, BlinkMacSystemFont, Segoe UI) | 16px | 600 | Extension name |
| Tab | System | 14px | 400/500 | Tab labels (500 when active) |
| Body | System | 14px | 400 | Status messages, buttons |
| Label | System | 13px | 500 | Form labels |
| Caption | System | 12px | 400 | History metadata, hints |
| Shortcut | Monospace | 13px | 600 | Keyboard shortcut display |
| Prompt | Monospace | 12px | 400 | Custom prompt textarea |
| Stat value | System | 28px | 600 | Statistics numbers |
| Stat label | System | 12px | 400 | Statistics labels |

#### 9.4 Spacing & Layout

- Popup width: 450px
- Popup max-height: 600px
- Page padding: 16px
- Tab gap: 8px
- Card padding: 12-16px
- Border radius: 4px (inputs), 8px (cards, buttons), 12px (status badges)
- Stats grid: 2 columns, 12px gap

#### 9.5 Component Specifications

| Component | Dimensions | States |
|-----------|-----------|--------|
| Primary button | 100% width, 12px padding, 8px radius | default / hover / disabled |
| Tab button | auto width, 8px/16px padding | default / active (blue underline) |
| Status bar | 100% width, 12px padding, 8px radius | info (blue) / success (green) / error (red) |
| History item | 100% width, 10px padding, 6px radius | default |
| Stat card | 50% width, 16px padding, 8px radius | default |
| Shortcut badge | auto, 6px/12px padding, 4px radius | default |

---

## PART E: Observability & Operations

### 11. Health, Monitoring & Logging

#### 11.1 Log System

All logs use `[VidMind]` prefix for easy filtering in DevTools.

| Event | Level | Component | Example |
|-------|-------|-----------|---------|
| Content script loaded | info | content-gemini | `[VidMind] Content script loaded at: <ISO>` |
| Pending analysis found | info | content-gemini | `[VidMind] Processing analysis for: <URL>` |
| Textarea found | info | content-gemini | `[VidMind] Visible textarea found!` |
| Video loaded | info | content-gemini | `[VidMind] Video loaded! (detected in ~Nms)` |
| Run button clicked | info | content-gemini | `[VidMind] Clicking run button` |
| Analysis complete | info | content-gemini | `[VidMind] Analysis complete, stopping heartbeat` |
| Textarea not found | error | content-gemini | `[VidMind] Timeout: Heuristic search failed` |
| Run button not found | error | content-gemini | `[VidMind] Run button not found` |
| Tab tracking | info | background | `[YT2Gemini] Tracking analysis tab: <ID>` |

#### 11.2 Health Checks

| Check | Frequency | What it verifies | Action |
|-------|-----------|-----------------|--------|
| Heartbeat | Every 2s | Analysis still running (Stop button or spinner present) | Stops heartbeat + fires notification on completion |
| Keepalive ping | Every 3s | Analysis tab still exists | Removes dead tabs from tracking set |
| Pending analysis TTL | On content script load | Analysis data < 30s old | Clears stale data |

### 12. Analytics & Tracking

| Event | When | Data | Purpose |
|-------|------|------|---------|
| Analysis started | handleVideoAnalysis() | videoId, timestamp, language | Usage stats |
| Analysis completed | analysisComplete message | tabId, duration | Success tracking |
| Daily usage | On each analysis | ISO date key + count | Daily trend |

All data stored locally. No PII. No external analytics services.

---

## PART G: Deployment & Configuration

### 18. Deployment & Configuration

#### 18.1 Environment Matrix

| Environment | Purpose | How to Load |
|-------------|---------|-------------|
| Local dev | Development & testing | `chrome://extensions/` → Load unpacked → select `chrome-extension/` folder |
| Chrome Web Store | Production distribution | Upload ZIP via Chrome Developer Dashboard |

#### 18.2 Local Development Setup

**Prerequisites:** Google Chrome (latest stable)

**Install:**
1. Clone repo: `git clone <repo-url>`
2. Open `chrome://extensions/`
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select `chrome-extension/` directory
6. Navigate to any YouTube video to test

**No build step required.** All files are plain JS/CSS/HTML.

#### 18.3 Chrome Web Store Publishing

1. Create ZIP of `chrome-extension/` directory (excluding `icons/library/`)
2. Upload to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Fill store listing: name, description, screenshots, category (Productivity)
4. Submit for review (typically 1-3 business days)

#### 18.4 Configuration & Constants

| Value | Constant/Location | Purpose |
|-------|-------------------|---------|
| 30000ms | content-gemini.js (timestamp check) | Pending analysis TTL |
| 500ms | content-gemini.js (textarea wait loop) | Textarea detection interval |
| 15s (30 iterations) | content-gemini.js | Max textarea wait time |
| 2000ms | content-gemini.js (heartbeat) | Heartbeat interval |
| 3000ms | background.js (keepalive) | Keepalive ping interval |
| 100 | background.js (addToHistory) | Max history entries |
| 800ms | popup.js (window.close) | Auto-close popup delay after success |
| 2000ms | content-gemini.js (switchToTab) | Delay before auto-switching back |

---

## PART F: Process & Principles

### 13. Implementation Principles

#### 13.1 Heuristic-First Selectors
Never hardcode AI Studio DOM selectors (jslog values, class names, formcontrolname). Always use heuristic detection: text content, aria-labels, visibility checks, material icon names. AI Studio's Angular UI changes frequently.

#### 13.2 Human-Like Timing
All automation actions include randomized delays (e.g., `150 + Math.random() * 100`ms) to simulate human behavior and avoid anti-automation detection.

#### 13.3 Graceful Fallbacks
Every DOM interaction has a fallback chain:
- Text insertion: `execCommand('insertText')` → native value setter + input event
- Button detection: exact selectors → heuristic text/icon search
- Clipboard: `navigator.clipboard.writeText()` → direct DOM insertion

#### 13.4 No Build Step
The extension must remain zero-build: plain JS, CSS, HTML. No bundlers, no transpilers, no TypeScript. This keeps development friction near zero and makes debugging straightforward.

### 14. Documentation Discipline

#### 14.1 AGENTS.md
See `AGENTS.md` at project root — defines invariants for future agents.

#### 14.2 PRD Updates
Update this PRD's revision history when features ship. Record what was built and when.

### 15. Technical Considerations

- **AI Studio UI instability:** Google frequently changes AI Studio's DOM structure. All selectors must be heuristic-based and resilient to change.
- **Angular form state:** Angular doesn't recognize programmatic value changes via `textarea.value = ...`. Must use `document.execCommand('insertText')` or dispatch proper input events.
- **Tab throttling:** Chrome throttles background tabs. Heartbeat simulates user activity (mousemove, scroll, focus) to prevent throttling during analysis.
- **Service worker lifecycle:** Manifest V3 service workers can be terminated. Active analysis tabs tracked in memory (`activeAnalysisTabs` Set) will be lost on restart — acceptable trade-off for simplicity.

### 16. Success Metrics

- Extension loads without errors on chrome://extensions/
- One-click analysis completes end-to-end (YouTube → AI Studio → result)
- Keyboard shortcuts trigger correctly
- i18n works for all 3 locales
- History records and displays analyses
- Stats count accurately

### 17. Open Questions

1. **Chrome Web Store screenshots:** Need actual screenshots for store listing — requires extension to be fully functional first. **Owner: developer, by v1.1.0 release.**
2. **AI Studio API changes:** If Google adds an official API for AI Studio, should VidMind migrate from DOM automation to API calls? **Owner: project lead, revisit quarterly.**

---

## Revision History

| Date | Version | Changes | By |
|------|---------|---------|-----|
| 2026-03-03 | 1.0.0 | Initial extension: one-click analysis, heartbeat, popup | Developer |
| 2026-03-10 | 1.0.1 | Heuristic selectors, execCommand fix, visibility checks | Developer |
| 2026-03-20 | 1.1.0-dev | i18n, tabbed popup, custom prompts, history, stats, context menu, keyboard shortcuts | Developer |
| 2026-04-07 | - | PRD created from existing codebase | Claude |
