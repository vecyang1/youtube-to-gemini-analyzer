# PRD: Queue Modes (Queue + Steer)

**Status:** ✅ Complete  
**Version:** 1.1  
**Created:** 2026-04-13  
**Last Updated:** 2026-04-13

---

## S1: Introduction

The VidMind floating queue panel currently has a single behavior that uses MutationObserver to auto-send queued messages. This causes a race condition: DOM mutations during Gemini's active generation can briefly make `isGeminiGenerating()` return false, injecting the queued message mid-generation and disrupting the answer.

This PRD introduces two distinct modes:

- **Queue Mode** (default): Waits until generation is fully complete AND the response is stable (no new text for 1s), then sends the next queued message.
- **Steer Mode**: Sends the message immediately during generation (current behavior, useful for steering the model mid-response).

Additionally: the toggle button becomes draggable with persistent position, and the panel anchors relative to it.

---

## S2: Goals

1. Eliminate the race condition causing premature message injection
2. Provide two clearly labeled modes: Queue (safe) and Steer (immediate)
3. Make the ⏳ toggle button draggable with persisted position
4. Keep the UI minimal and non-intrusive

**Non-Goals:**
- Keyboard shortcuts for queue (proven unreliable due to Gemini conflicts)
- Background script queue monitor (moving entirely to content script)

---

## S3: User Stories

### US-001: Reliable Queue Mode
**As a** user watching Gemini generate a response,  
**I want to** queue follow-up questions that only send after the response is fully complete,  
**So that** my follow-ups don't interrupt or corrupt the current answer.

**Acceptance Criteria:**
- [x] Queued messages never inject during active generation
- [x] "Fully complete" = Stop button gone AND no new text rendered for 1 second
- [x] Status indicator shows "waiting..." while monitoring, "sending..." when dispatching
- [x] Multiple queued messages chain sequentially (each waits for its response to finish)

### US-002: Steer Mode
**As a** power user,  
**I want to** optionally inject a message during generation to steer the model's response,  
**So that** I can redirect the answer without waiting.

**Acceptance Criteria:**
- [x] Toggle switch in floating panel header: "Queue" | "Steer"
- [x] Steer mode sends immediately upon "Add to Queue" click (no waiting)
- [x] Visual distinction: Steer mode header turns orange
- [x] Default mode is Queue

### US-003: Draggable Toggle Button with Persistent Position
**As a** user,  
**I want to** drag the ⏳ button to a comfortable screen position that persists across reloads,  
**So that** it doesn't block content I'm reading.

**Acceptance Criteria:**
- [x] ⏳ button is draggable via mousedown+mousemove
- [x] Position saved to chrome.storage.local on drag end
- [x] Position restored on page load
- [x] Panel anchors relative to toggle button position
- [x] Click (without drag) toggles panel open/close

---

## S4: Functional Requirements

### FR-1: Generation Completion Detection (Queue Mode)
Replace MutationObserver-triggered auto-send with a two-phase polling approach:
1. **Phase A**: Poll every 500ms — check `isGeminiGenerating()` returns false (no Stop button, no progress spinners)
2. **Phase B**: After Phase A passes, snapshot the response container's `textContent.length`. Poll every 500ms for 1 second. If length is stable (no new text), generation is truly complete.
3. Only then dequeue and send next message.

### FR-2: Steer Mode Send
When mode is "Steer":
- On "Add to Queue" click, find the Gemini textarea, insert message, and click Run/Submit immediately
- If Run button is not available (generating), type into textarea and press Enter natively
- No queue storage needed — send inline

### FR-3: Mode Toggle
- Toggle switch in panel header between "Queue" and "Steer"
- Persisted in `chrome.storage.sync` as `queueMode: 'queue' | 'steer'`
- Panel header color: blue (Queue) / orange (Steer)
- Mode label visible in header

### FR-4: Draggable Position Persistence
- On mouseup after drag, save `{ x, y }` to `chrome.storage.local` as `queueTogglePosition`
- On content script load, read position and apply
- Default: `bottom: 120px, right: 16px`
- Boundary clamp: keep button within viewport

### FR-5: Remove Background Script Queue Monitor
- Delete the `startQueueMonitor` function and `queueMonitorInterval` from background.js
- Delete the `startQueueMonitor` message handler
- All queue logic lives in the content script (keyboard-interceptor.js)

---

## S5: Technical Design

### Files Modified
| File | Change |
|------|--------|
| `keyboard-interceptor.js` | Rewrite queue panel: two modes, polling-based auto-send, draggable with persistence |
| `background.js` | Remove queue monitor code (lines 320–425) |
| `popup.js` | Remove `startQueueMonitor` message send |

### Generation Completion Detection (Pseudocode)
```
function waitForGenerationComplete():
  // Phase A: Wait for Stop button to disappear
  poll every 500ms:
    if isGeminiGenerating() → continue
    else → proceed to Phase B

  // Phase B: Wait for response text to stabilize (1s)
  snapshot = getResponseTextLength()
  wait 500ms
  if getResponseTextLength() === snapshot:
    wait 500ms
    if getResponseTextLength() === snapshot:
      → GENERATION COMPLETE, send next message
    else → restart Phase B
  else → restart Phase B
```

### Steer Mode (Pseudocode)
```
function steerSend(message):
  textarea = findPromptTextarea()
  textarea.focus()
  execCommand('insertText', message)
  
  runButton = findRunButton()
  if runButton and runButton.enabled:
    runButton.click()
  else:
    // During generation, textarea submit may work
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
```

---

## S6: Safety

### S6.1: Zero-Regression Contract
- Enter/Cmd+Enter keyboard behavior must not change
- Video analysis flow (content-gemini.js) must not be affected
- Popup settings toggle (showQueueFloat) must continue working

### S6.2: Race Condition Mitigation
- Queue mode uses polling (NOT MutationObserver) to avoid DOM-change-triggered false positives
- 1-second text stability check prevents sending during "brief pauses" in generation
- Auto-sender has a mutex: `isSending` flag prevents re-entrant sends

---

## S7: Implementation Plan

| Order | Story | Effort |
|-------|-------|--------|
| 1 | FR-5: Remove background queue monitor | Small |
| 2 | FR-1: Rewrite auto-sender with polling + text stability | Medium |
| 3 | FR-3: Mode toggle (Queue/Steer) | Small |
| 4 | FR-2: Steer mode send | Small |
| 5 | FR-4: Draggable position persistence | Small |
| 6 | US-001/002/003: Integration test & verify | Small |

---

## Revision History

| Date | Version | Changes | By |
|------|---------|---------|-----|
| 2026-04-13 | 1.0 | Initial PRD | Claude |
| 2026-04-13 | 1.1 | All user stories complete — FR-1 through FR-5 implemented, popup.js cleanup | Claude |
