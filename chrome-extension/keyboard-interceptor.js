// Keyboard interceptor for Gemini AI Studio
// Supports Enter/Cmd+Enter toggle + message queue during generation

(function() {
  console.log('[VidMind] Keyboard interceptor loaded');

  let enterBehavior = 'submit';
  let preferenceLoaded = false;

  // --- Message Queue ---
  const messageQueue = [];
  let queueMonitorActive = false;

  chrome.storage.sync.get(['enterBehavior'], (result) => {
    enterBehavior = result.enterBehavior || 'submit';
    preferenceLoaded = true;
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.enterBehavior) {
      enterBehavior = changes.enterBehavior.newValue;
    }
  });

  // --- Queue UI Badge ---
  function getOrCreateBadge() {
    let badge = document.getElementById('vidmind-queue-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'vidmind-queue-badge';
      badge.style.cssText =
        'position:fixed;bottom:80px;right:24px;z-index:99999;' +
        'background:#1a73e8;color:#fff;border-radius:20px;' +
        'padding:6px 14px;font:13px/1.4 Google Sans,sans-serif;' +
        'box-shadow:0 2px 8px rgba(0,0,0,.25);display:none;' +
        'transition:opacity .2s,transform .2s;cursor:default;' +
        'user-select:none;';
      document.body.appendChild(badge);
    }
    return badge;
  }

  function updateBadge() {
    const badge = getOrCreateBadge();
    if (messageQueue.length === 0) {
      badge.style.display = 'none';
      return;
    }
    badge.style.display = 'block';
    const count = messageQueue.length;
    const preview = messageQueue[0].length > 30
      ? messageQueue[0].slice(0, 30) + '...'
      : messageQueue[0];
    badge.textContent = count === 1
      ? `\u23F3 1 queued: ${preview}`
      : `\u23F3 ${count} queued`;
    badge.title = messageQueue.map((m, i) => `${i + 1}. ${m}`).join('\n');
  }

  // --- Queue Button (visible during generation) ---
  function getOrCreateQueueButton() {
    let btn = document.getElementById('vidmind-queue-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'vidmind-queue-btn';
      btn.textContent = '\u23F3 Queue (\u2318J)';
      btn.title = 'Type your follow-up, then click to queue (or press Cmd/Ctrl+J)';
      btn.style.cssText =
        'display:none;position:fixed;bottom:70px;right:24px;z-index:99999;' +
        'background:#ea4335;color:#fff;border:none;border-radius:20px;' +
        'padding:8px 18px;font:13px/1.4 Google Sans,system-ui,sans-serif;' +
        'font-weight:500;cursor:pointer;box-shadow:0 3px 10px rgba(234,67,53,.4);' +
        'transition:opacity .2s,background .15s,transform .15s;';
      btn.addEventListener('mouseenter', () => { btn.style.background = '#1565c0'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#1a73e8'; });
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        const textarea = findAnyPromptTextarea();
        if (!textarea || !textarea.value.trim()) {
          textarea?.focus();
          return;
        }
        handleSubmit(textarea);
      });
      document.body.appendChild(btn);
    }
    return btn;
  }

  // Show/hide Queue button based on generation state
  setInterval(() => {
    const btn = getOrCreateQueueButton();
    btn.style.display = isGeminiGenerating() ? 'block' : 'none';
  }, 500);

  // --- Gemini State Detection ---
  function isGeminiGenerating() {
    // Check for Stop button
    const allButtons = document.querySelectorAll('button, [role="button"]');
    for (const button of allButtons) {
      const text = (button.textContent || '').trim().toLowerCase();
      const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
      const title = (button.getAttribute('title') || '').toLowerCase();

      if (text === 'stop' || title === 'stop' ||
          ariaLabel === 'stop' || ariaLabel === 'stop generating') {
        if (isButtonActive(button)) return true;
      }
    }
    // Check for spinners
    const spinners = document.querySelectorAll(
      'mat-progress-spinner, .mat-mdc-progress-spinner, [role="progressbar"]'
    );
    return Array.from(spinners).some(s => s.offsetParent !== null);
  }

  // --- Queue Monitor ---
  // Uses MutationObserver to detect when generation stops, then sends next message.
  function startQueueMonitor() {
    if (queueMonitorActive) return;
    queueMonitorActive = true;
    console.log('[VidMind] Queue monitor started');

    const check = () => {
      if (messageQueue.length === 0) {
        queueMonitorActive = false;
        console.log('[VidMind] Queue empty, monitor stopped');
        observer.disconnect();
        clearInterval(fallback);
        return;
      }
      if (!isGeminiGenerating()) {
        // Generation finished — send next queued message
        sendNextQueued();
      }
    };

    const observer = new MutationObserver(() => check());
    observer.observe(document.body, {
      childList: true, subtree: true, attributes: true
    });

    // Fallback poll every 1.5s in case MutationObserver misses it
    const fallback = setInterval(() => check(), 1500);
  }

  async function sendNextQueued() {
    if (messageQueue.length === 0) return;

    const msg = messageQueue.shift();
    updateBadge();
    console.log('[VidMind] Auto-sending queued message:', msg.slice(0, 50));

    // Small delay to let UI settle after previous generation
    await sleep(600);

    const textarea = findAnyPromptTextarea();
    if (!textarea) {
      console.error('[VidMind] Cannot find textarea for queued message');
      // Put it back
      messageQueue.unshift(msg);
      updateBadge();
      return;
    }

    textarea.focus();
    await sleep(50);

    // Clear textarea first
    textarea.value = '';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(50);

    // Insert queued message
    const inserted = document.execCommand('insertText', false, msg);
    if (!inserted) {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      ).set;
      setter.call(textarea, msg);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    await sleep(100);

    // Click run
    const runButton = findRunButton();
    if (runButton) {
      runButton.click();
      console.log('[VidMind] Queued message sent');
    } else {
      console.error('[VidMind] Run button not found for queued message');
      messageQueue.unshift(msg);
      updateBadge();
    }
  }

  // --- Keyboard Handler ---
  // CRITICAL: During generation, we must block Enter/Cmd+Enter from reaching
  // Gemini's native handler (which would stop generation). We intercept on
  // ANY element, not just textarea, to prevent the Stop button from activating.
  // Ctrl+J = queue message (separate listener, no Enter conflict)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'j' || !(e.ctrlKey || e.metaKey) || e.shiftKey) return;
    if (!isGeminiGenerating()) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const textarea = findPromptTextarea(e.target) || findAnyPromptTextarea();
    if (textarea && textarea.value.trim()) {
      handleSubmit(textarea);
    }
  }, true);

  // Enter key handler (normal submit/newline behavior when NOT generating)
  document.addEventListener('keydown', (e) => {
    if (!preferenceLoaded) return;
    if (e.key !== 'Enter') return;

    const isEnter = !e.metaKey && !e.ctrlKey && !e.shiftKey;
    const isCmdEnter = e.metaKey || e.ctrlKey;
    const isSubmitKey = enterBehavior === 'submit' ? isEnter : isCmdEnter;
    const isNewlineKey = enterBehavior === 'submit' ? isCmdEnter : isEnter;

    // Not generating: normal behavior
    const target = findPromptTextarea(e.target);
    if (!target) return;

    if (isSubmitKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit(target);
    } else if (isNewlineKey) {
      e.preventDefault();
      e.stopPropagation();
      insertNewline(target);
    }
  }, true);

  function handleSubmit(textarea) {
    const text = textarea.value.trim();
    if (!text) return;

    if (isGeminiGenerating()) {
      // Queue the message instead of submitting
      messageQueue.push(text);
      updateBadge();
      console.log('[VidMind] Message queued (%d total):', messageQueue.length, text.slice(0, 50));

      // Clear textarea so user knows it was captured
      textarea.value = '';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      // Flash badge to confirm
      const badge = getOrCreateBadge();
      badge.style.transform = 'scale(1.1)';
      setTimeout(() => { badge.style.transform = 'scale(1)'; }, 200);

      startQueueMonitor();
    } else {
      // Normal submit
      clickRunButton();
    }
  }

  function clickRunButton() {
    const runButton = findRunButton();
    if (runButton && !runButton.disabled) {
      runButton.click();
    }
  }

  function insertNewline(textarea) {
    const inserted = document.execCommand('insertText', false, '\n');
    if (inserted) return;

    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    );
    if (!descriptor || !descriptor.set) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    descriptor.set.call(textarea, value.substring(0, start) + '\n' + value.substring(end));

    textarea.dispatchEvent(new InputEvent('input', {
      bubbles: true, cancelable: true, inputType: 'insertLineBreak'
    }));
    textarea.selectionStart = textarea.selectionEnd = start + 1;
  }

  // --- DOM Helpers ---
  function findPromptTextarea(target) {
    if (target.tagName !== 'TEXTAREA') return null;
    if (!target.offsetParent || target.getBoundingClientRect().height === 0) return null;

    let score = 0;
    const placeholder = (target.getAttribute('placeholder') || '').toLowerCase();
    const ariaLabel = (target.getAttribute('aria-label') || '').toLowerCase();
    const formControl = (target.getAttribute('formcontrolname') || '').toLowerCase();

    if (placeholder.includes('prompt') || placeholder.includes('type') || placeholder.includes('ask')) score += 3;
    if (ariaLabel.includes('prompt') || ariaLabel.includes('chat') || ariaLabel.includes('input')) score += 3;
    if (formControl.includes('prompt')) score += 3;
    if (target.hasAttribute('cdktextareaautosize')) score += 2;
    if (window.location.hostname.includes('aistudio.google.com')) score += 1;

    return score > 0 ? target : null;
  }

  function findAnyPromptTextarea() {
    const all = Array.from(document.querySelectorAll('textarea'));
    const visible = all.filter(t => t.offsetParent !== null && t.getBoundingClientRect().height > 0);
    if (visible.length === 1) return visible[0];

    let best = null, bestScore = -1;
    for (const t of visible) {
      let score = 0;
      const p = (t.getAttribute('placeholder') || '').toLowerCase();
      const a = (t.getAttribute('aria-label') || '').toLowerCase();
      const f = (t.getAttribute('formcontrolname') || '').toLowerCase();
      if (p.includes('prompt') || p.includes('type') || p.includes('ask')) score += 5;
      if (a.includes('prompt') || a.includes('chat') || a.includes('input')) score += 5;
      if (f.includes('prompt')) score += 3;
      if (t.hasAttribute('cdktextareaautosize')) score += 2;
      if (score > bestScore) { bestScore = score; best = t; }
    }
    return best || visible[visible.length - 1] || null;
  }

  function findRunButton() {
    const knownSelectors = [
      'button[jslog*="250044"]',
      'button[jslog*="225921"]',
      'ms-run-button button',
      'button.ctrl-enter-submits'
    ];

    for (const selector of knownSelectors) {
      try {
        const btn = document.querySelector(selector);
        if (btn && isButtonActive(btn)) return btn;
      } catch (e) {}
    }

    const allButtons = document.querySelectorAll('button, [role="button"]');
    for (const btn of allButtons) {
      if (!isButtonActive(btn)) continue;
      const text = (btn.textContent || '').trim().toLowerCase();
      const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
      const title = (btn.getAttribute('title') || '').toLowerCase();

      if (text === 'run' || text === 'submit' || text === 'send') return btn;
      if (ariaLabel === 'run' || ariaLabel === 'submit' || ariaLabel === 'send message') return btn;
      if (title === 'run' || title === 'submit' || title === 'send') return btn;

      const hasRunIcon = Array.from(btn.querySelectorAll('.material-symbols-outlined, mat-icon'))
        .some(icon => {
          const t = (icon.textContent || '').trim().toLowerCase();
          return t === 'send' || t === 'play_arrow' || t === 'arrow_upward';
        });
      if (hasRunIcon) return btn;
    }
    return null;
  }

  function isButtonActive(button) {
    return !button.disabled &&
           button.getAttribute('aria-disabled') !== 'true' &&
           button.offsetParent !== null;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();
