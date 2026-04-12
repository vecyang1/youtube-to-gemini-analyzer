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

  // --- Step 3: Wait for video chip (MutationObserver — reacts instantly) ---
  const chipDetected = await waitForCondition(
    () => {
      // Check for video chip/attachment element
      const chip = document.querySelector(
        'mat-chip, .mat-mdc-chip, ' +
        '[role="button"][aria-label*="video"], [aria-label*="YouTube"], ' +
        '[data-test-id*="chip"], [data-test-id*="file"], ' +
        '.file-chip, .attachment-chip, .media-chip'
      );
      if (chip) return chip;

      // Or textarea value changed (URL replaced by chip)
      if (textarea.value !== videoUrl && textarea.value !== '') return true;

      return null;
    },
    12000,
    'video chip'
  );

  if (!chipDetected) {
    console.warn('[VidMind] Video chip timeout, continuing anyway');
  }

  // Brief stability delay — let Angular finish rendering after chip insert
  await sleep(200);

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

function findRunButton() {
  const exactSelectors = [
    'button[jslog*="250044"]',
    'button[jslog*="225921"]',
    'ms-run-button button',
    'button.ctrl-enter-submits'
  ];

  for (const selector of exactSelectors) {
    try {
      const button = document.querySelector(selector);
      if (button && isButtonActive(button)) return button;
    } catch (e) {}
  }

  return findHeuristicRunButton();
}

function isButtonActive(button) {
  return !button.disabled &&
         button.getAttribute('aria-disabled') !== 'true' &&
         button.offsetParent !== null;
}

function findHeuristicTextarea() {
  const allTextareas = Array.from(document.querySelectorAll('textarea'));
  const visible = allTextareas.filter(t => t.offsetParent !== null && t.getBoundingClientRect().height > 0);

  if (visible.length === 1) return visible[0];

  let bestScore = -1;
  let best = null;

  for (const t of visible) {
    let score = 0;
    const placeholder = (t.getAttribute('placeholder') || '').toLowerCase();
    if (placeholder.includes('prompt') || placeholder.includes('type') || placeholder.includes('ask')) score += 5;

    const ariaLabel = (t.getAttribute('aria-label') || '').toLowerCase();
    if (ariaLabel.includes('prompt') || ariaLabel.includes('chat') || ariaLabel.includes('input')) score += 5;

    const formControl = (t.getAttribute('formcontrolname') || '').toLowerCase();
    if (formControl.includes('prompt')) score += 3;

    if (t.hasAttribute('cdktextareaautosize')) score += 2;

    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }

  return bestScore >= 0 ? best : (visible[visible.length - 1] || null);
}

function findHeuristicRunButton() {
  const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
  const active = allButtons.filter(isButtonActive);

  for (const b of active) {
    const text = (b.textContent || '').trim().toLowerCase();
    const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
    const title = (b.getAttribute('title') || '').toLowerCase();

    if (text === 'run' || text === 'submit' || text === 'send') return b;
    if (ariaLabel === 'run' || ariaLabel === 'submit' || ariaLabel === 'send message') return b;
    if (title === 'run' || title === 'submit' || title === 'send') return b;

    const hasMaterialIcon = Array.from(b.querySelectorAll('.material-symbols-outlined, mat-icon'))
      .some(icon => {
        const iconText = (icon.textContent || '').trim().toLowerCase();
        return iconText === 'send' || iconText === 'play_arrow' || iconText === 'arrow_upward';
      });
    if (hasMaterialIcon) return b;
  }

  return null;
}

function startHeartbeat() {
  let heartbeatInterval = setInterval(() => {
    const animatedElements = document.querySelectorAll('.spin, [style*="animation"], svg animateTransform, mat-progress-spinner');
    const isSpinning = animatedElements.length > 0;

    let isStopping = false;
    const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
    for (const button of allButtons) {
      const text = (button.textContent || '').trim().toLowerCase();
      const title = (button.getAttribute('title') || '').toLowerCase();
      const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();

      if (text === 'stop' || title === 'stop' || ariaLabel === 'stop' || ariaLabel === 'stop generating') {
        if (isButtonActive(button)) {
          isStopping = true;
          break;
        }
      }
    }

    if (!isStopping && !isSpinning) {
      clearInterval(heartbeatInterval);
      chrome.runtime.sendMessage({ action: 'analysisComplete' });
    } else {
      document.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true, cancelable: true, view: window,
        clientX: Math.random() * window.innerWidth,
        clientY: Math.random() * window.innerHeight
      }));
      window.dispatchEvent(new Event('scroll'));
      requestAnimationFrame(() => {});
    }
  }, 2000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
