// Content script for Google AI Studio
(async function() {
  console.log('[VidMind] Content script loaded at:', new Date().toISOString());

  const data = await chrome.storage.local.get('pendingAnalysis');
  if (!data.pendingAnalysis) return;

  const { videoUrl, prompt, timestamp, returnToTabId } = data.pendingAnalysis;

  if (Date.now() - timestamp > 30000) {
    await chrome.storage.local.remove('pendingAnalysis');
    return;
  }

  console.log('[VidMind] Processing:', videoUrl);

  // --- Step 1: Wait for textarea (MutationObserver, instant reaction) ---
  const textarea = await waitForCondition(
    () => findHeuristicTextarea(),
    15000,
    'textarea'
  );
  if (!textarea) {
    console.error('[VidMind] Textarea not found');
    return;
  }

  // --- Step 2: Insert YouTube URL (single paste, no duplication) ---
  await sleep(100);
  textarea.focus();
  await sleep(50);

  try {
    await navigator.clipboard.writeText(videoUrl);
  } catch (e) {}

  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: new DataTransfer()
  });
  pasteEvent.clipboardData.setData('text/plain', videoUrl);
  const pasteHandled = !textarea.dispatchEvent(pasteEvent);

  if (!pasteHandled && !textarea.value.includes(videoUrl)) {
    const inserted = document.execCommand('insertText', false, videoUrl);
    if (!inserted) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(textarea, videoUrl);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  console.log('[VidMind] URL inserted, waiting for video chip...');

  // --- Step 3: Wait for video chip to appear AND finish loading ---
  // Phase A: Wait for chip element to appear in DOM
  const chipDetected = await waitForCondition(
    () => {
      const chip = document.querySelector(
        'mat-chip, .mat-mdc-chip, ' +
        '[role="button"][aria-label*="video"], [aria-label*="YouTube"], ' +
        '[data-test-id*="chip"], [data-test-id*="file"], ' +
        '.file-chip, .attachment-chip, .media-chip'
      );
      if (chip) return chip;
      if (textarea.value !== videoUrl && textarea.value !== '') return true;
      return null;
    },
    12000,
    'video chip appear'
  );

  if (!chipDetected) {
    console.warn('[VidMind] Video chip timeout, continuing anyway');
  }

  // Phase B: Wait for chip to finish loading (no spinners/progress on it)
  // Gemini shows the chip immediately but backend ingestion takes longer.
  // Submitting before ingestion completes → "permission denied".
  const chipReady = await waitForCondition(
    () => {
      // Check for ANY loading indicator near the chip / input area
      const loadingIndicators = document.querySelectorAll(
        'mat-progress-spinner, mat-progress-bar, .loading, .spinner, ' +
        '[role="progressbar"], .mat-mdc-progress-spinner, ' +
        'mat-chip .spin, mat-chip [class*="loading"], ' +
        '.uploading, [class*="upload"], [class*="processing"]'
      );
      // Ready when no loading indicators are visible
      const hasLoading = Array.from(loadingIndicators).some(
        el => el.offsetParent !== null
      );
      return hasLoading ? null : true;
    },
    10000,
    'video chip ready'
  );

  // Minimum processing buffer — even if no spinner detected, Gemini's
  // backend needs time to finish ingesting the video before we can submit
  await sleep(chipReady ? 800 : 1500);

  // --- Step 4: Insert analysis prompt ---
  textarea.focus();
  await sleep(50);

  const promptText = '\n\n' + prompt;
  const insertedPrompt = document.execCommand('insertText', false, promptText);
  if (!insertedPrompt) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, textarea.value + promptText);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
  textarea.dispatchEvent(new Event('change', { bubbles: true }));

  console.log('[VidMind] Prompt inserted');

  // --- Step 5: Wait for run button to become active, then click ---
  const runButton = await waitForCondition(
    () => findRunButton(),
    5000,
    'run button'
  );

  if (runButton) {
    await sleep(100);
    runButton.click();
    console.log('[VidMind] Run button clicked');

    chrome.runtime.sendMessage({ action: 'analysisStarted' });

    if (returnToTabId) {
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'switchToTab', tabId: returnToTabId });
      }, 2000);
    }

    startHeartbeat();
  } else {
    console.error('[VidMind] Run button not found');
  }

  await chrome.storage.local.remove('pendingAnalysis');
})();

// --- Adaptive wait: MutationObserver + polling hybrid ---
// Reacts instantly to DOM changes instead of blind fixed-interval polling.
// Falls back to periodic check every 500ms for non-DOM conditions (e.g. value changes).
function waitForCondition(checkFn, timeoutMs, label) {
  return new Promise((resolve) => {
    // Immediate check
    const immediate = checkFn();
    if (immediate) {
      console.log(`[VidMind] ${label}: found immediately`);
      resolve(immediate);
      return;
    }

    const startTime = Date.now();
    let resolved = false;

    const done = (result) => {
      if (resolved) return;
      resolved = true;
      observer.disconnect();
      clearInterval(fallbackInterval);
      clearTimeout(timeout);
      const elapsed = Date.now() - startTime;
      console.log(`[VidMind] ${label}: ${result ? 'found' : 'timeout'} in ${elapsed}ms`);
      resolve(result || null);
    };

    // MutationObserver — fires on any DOM change, checks condition instantly
    const observer = new MutationObserver(() => {
      const result = checkFn();
      if (result) done(result);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    // Fallback poll every 500ms for non-DOM conditions (value changes, etc.)
    const fallbackInterval = setInterval(() => {
      const result = checkFn();
      if (result) done(result);
    }, 500);

    // Hard timeout
    const timeout = setTimeout(() => done(null), timeoutMs);
  });
}

// Listen for keepalive pings
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'keepalive') {
    sendResponse({ alive: true });
    return true;
  }
});

// ====== ADAPTIVE DOM DETECTION (shared design with keyboard-interceptor.js) ======
// Multi-strategy cascading: known selectors → semantic heuristics → structural fallback

function isButtonVisible(btn) {
  return btn.offsetParent !== null &&
         !btn.disabled &&
         btn.getAttribute('aria-disabled') !== 'true';
}

// Alias for backward compat
function isButtonActive(btn) { return isButtonVisible(btn); }

function btnText(btn) {
  let text = '';
  for (const node of btn.childNodes) {
    if (node.nodeType === 3) {
      text += node.textContent;
    } else if (node.nodeType === 1) {
      const cls = (node.className || '').toString().toLowerCase();
      if (cls.includes('material-symbols') || cls.includes('mat-icon') ||
          cls.includes('icon') || cls.includes('command-key') ||
          node.tagName === 'SVG' || node.tagName === 'CANVAS') continue;
      text += node.textContent;
    }
  }
  return text.trim().toLowerCase();
}

function hasIcon(el, iconNames) {
  const iconEls = el.querySelectorAll(
    '.material-symbols-outlined, mat-icon, [class*="icon"], svg'
  );
  for (const icon of iconEls) {
    const t = (icon.textContent || '').trim().toLowerCase();
    if (iconNames.some(name => t === name)) return true;
  }
  return false;
}

function gatherAttrs(el) {
  return [
    el.getAttribute('placeholder'),
    el.getAttribute('aria-label'),
    el.getAttribute('title'),
    el.getAttribute('formcontrolname'),
    el.getAttribute('name'),
    el.getAttribute('data-test-id')
  ].filter(Boolean).map(s => s.toLowerCase()).join(' ');
}

function findHeuristicTextarea() {
  const all = Array.from(document.querySelectorAll('textarea'));
  const visible = all.filter(t =>
    t.offsetParent !== null && t.getBoundingClientRect().height > 0
  );
  if (visible.length === 0) return null;
  if (visible.length === 1) return visible[0];

  let best = null, bestScore = -1;
  const keywords = ['prompt', 'type', 'ask', 'chat', 'input', 'message'];

  for (const t of visible) {
    let score = 0;
    const attrs = gatherAttrs(t);
    if (keywords.some(k => attrs.includes(k))) score += 5;
    if (t.hasAttribute('cdktextareaautosize')) score += 2;
    if (t.getAttribute('formcontrolname')) score += 2;
    const rect = t.getBoundingClientRect();
    if (rect.top > window.innerHeight * 0.5) score += 1;
    if (rect.height > 30) score += 1;

    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best || visible[visible.length - 1];
}

function findRunButton() {
  // Tier 1: known exact selectors
  const tier1 = [
    'ms-run-button button',
    'button.ctrl-enter-submits',
    'button[jslog*="225921"]',
    'button[jslog*="250044"]',
    'button[type="submit"]'
  ];
  for (const sel of tier1) {
    try {
      const btn = document.querySelector(sel);
      if (btn && isButtonVisible(btn)) return btn;
    } catch (_) {}
  }

  // Tier 2: semantic — text / aria / icon
  const allBtns = Array.from(document.querySelectorAll('button, [role="button"]'));
  const visible = allBtns.filter(isButtonVisible);
  const runKeywords = ['run', 'submit', 'send'];
  const runIcons = ['send', 'play_arrow', 'arrow_upward'];

  for (const btn of visible) {
    const txt = btnText(btn);
    if (runKeywords.some(k => txt === k)) return btn;
  }
  for (const btn of visible) {
    if (hasIcon(btn, runIcons)) return btn;
  }

  // Tier 3: structural — primary button nearest the textarea
  const textarea = findHeuristicTextarea();
  if (textarea) {
    let container = textarea.parentElement;
    for (let i = 0; i < 6 && container; i++) {
      const btns = visible.filter(b => container.contains(b));
      if (btns.length > 0) {
        for (const b of btns) {
          const txt = btnText(b);
          if (runKeywords.some(k => txt.includes(k))) return b;
        }
        return btns[btns.length - 1];
      }
      container = container.parentElement;
    }
  }

  return null;
}

function isGeminiGenerating() {
  // Signal 1: Stop button
  const allBtns = document.querySelectorAll('button, [role="button"]');
  for (const b of allBtns) {
    if (!isButtonVisible(b)) continue;
    const txt = btnText(b);
    const aria = (b.getAttribute('aria-label') || '').toLowerCase();
    if (txt === 'stop' || aria === 'stop' || aria === 'stop generating' ||
        aria === 'cancel generation' || txt === 'cancel') return true;
    if (hasIcon(b, ['stop', 'stop_circle', 'cancel', 'pause'])) return true;
  }

  // Signal 2: Progress indicators
  const spinnerSels = [
    'mat-progress-spinner', 'mat-progress-bar',
    '.mat-mdc-progress-spinner', '.mat-mdc-progress-bar',
    '[role="progressbar"]', '.spinner', '.spin'
  ];
  for (const sel of spinnerSels) {
    try {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (el.offsetParent !== null) return true;
      }
    } catch (_) {}
  }

  // Signal 3: Run button container in stop state
  const runContainers = document.querySelectorAll(
    'ms-run-button, [class*="run-button"], [class*="submit-button"]'
  );
  for (const c of runContainers) {
    if (hasIcon(c, ['stop', 'stop_circle'])) return true;
  }

  // Signal 4: Generating/streaming CSS classes
  const animated = document.querySelectorAll(
    '[class*="generating"], [class*="streaming"], [class*="typing"]'
  );
  if (animated.length > 0) return true;

  return false;
}

function startHeartbeat() {
  let heartbeatInterval = setInterval(() => {
    if (isGeminiGenerating()) {
      // Keep the tab alive during generation
      document.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true, cancelable: true, view: window,
        clientX: Math.random() * window.innerWidth,
        clientY: Math.random() * window.innerHeight
      }));
      window.dispatchEvent(new Event('scroll'));
      requestAnimationFrame(() => {});
    } else {
      clearInterval(heartbeatInterval);
      chrome.runtime.sendMessage({ action: 'analysisComplete' });
    }
  }, 2000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
