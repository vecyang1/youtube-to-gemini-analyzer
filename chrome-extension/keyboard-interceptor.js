// Keyboard interceptor for Gemini AI Studio
// Supports Enter/Cmd+Enter toggle for submit/newline
// Robust adaptive DOM detection — survives AI Studio UI changes

(function() {
  console.log('[VidMind] Keyboard interceptor loaded');

  let enterBehavior = 'submit';
  let preferenceLoaded = false;

  chrome.storage.sync.get(['enterBehavior'], (result) => {
    enterBehavior = result.enterBehavior || 'submit';
    preferenceLoaded = true;
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.enterBehavior) {
      enterBehavior = changes.enterBehavior.newValue;
    }
  });

  // ====== ADAPTIVE DOM DETECTION ENGINE ======
  // Every function uses multi-strategy cascading:
  //   Tier 1 — exact known selectors (fast, can break on UI update)
  //   Tier 2 — semantic heuristics (aria, text, role — resilient)
  //   Tier 3 — structural/positional (last resort, very resilient)
  // Successful tier is cached; cache auto-invalidates when stale.

  const _cache = {}; // { key: { selector, ts } }
  const CACHE_TTL = 5000; // re-validate every 5s

  function cachedQueryOne(key, tryFn) {
    const c = _cache[key];
    if (c && (Date.now() - c.ts < CACHE_TTL)) {
      const el = document.querySelector(c.selector);
      if (el && el.offsetParent !== null) return el;
    }
    const result = tryFn();
    if (result && result._cacheSelector) {
      _cache[key] = { selector: result._cacheSelector, ts: Date.now() };
    }
    return result;
  }

  // --- Find the main prompt textarea ---
  function findAnyTextarea() {
    const all = Array.from(document.querySelectorAll('textarea'));
    const visible = all.filter(t =>
      t.offsetParent !== null && t.getBoundingClientRect().height > 0
    );
    if (visible.length === 0) return null;
    if (visible.length === 1) return visible[0];

    // Score each textarea
    let best = null, bestScore = -1;
    for (const t of visible) {
      let score = 0;
      const attrs = gatherText(t);

      // Placeholder / aria clues
      if (matchesAny(attrs, ['prompt', 'type something', 'type here', 'ask', 'message', 'chat', 'input'])) score += 5;
      // Angular-specific attributes (may vanish)
      if (t.hasAttribute('cdktextareaautosize')) score += 2;
      if (t.getAttribute('formcontrolname')) score += 2;
      // Position: bottom of page = likely the prompt input
      const rect = t.getBoundingClientRect();
      if (rect.top > window.innerHeight * 0.5) score += 1;
      // Larger textarea = more likely to be the main input
      if (rect.height > 30) score += 1;

      if (score > bestScore) { bestScore = score; best = t; }
    }
    return best || visible[visible.length - 1];
  }

  function findPromptTextarea(target) {
    if (target.tagName !== 'TEXTAREA') return null;
    if (!target.offsetParent || target.getBoundingClientRect().height === 0) return null;
    // Reject our own queue textarea
    if (target.id === 'vidmind-q-input') return null;

    const attrs = gatherText(target);
    let score = 0;
    if (matchesAny(attrs, ['prompt', 'type', 'ask', 'chat', 'input', 'message'])) score += 3;
    if (target.hasAttribute('cdktextareaautosize')) score += 2;
    if (target.getAttribute('formcontrolname')) score += 2;
    if (window.location.hostname.includes('aistudio.google.com')) score += 1;

    return score > 0 ? target : null;
  }

  // --- Find the Run / Submit button ---
  function findRunButton() {
    return cachedQueryOne('runBtn', () => {
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
          if (btn && isButtonVisible(btn)) {
            btn._cacheSelector = sel;
            return btn;
          }
        } catch (_) {}
      }

      // Tier 2: semantic — text / aria / icon content
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

      // Tier 3: structural — the primary/submit button nearest the textarea
      const textarea = findAnyTextarea();
      if (textarea) {
        const nearbyBtns = findNearbyButtons(textarea, visible);
        for (const btn of nearbyBtns) {
          const txt = btnText(btn);
          if (runKeywords.some(k => txt.includes(k))) return btn;
        }
        // Last visible button in the same container = often the submit
        if (nearbyBtns.length > 0) return nearbyBtns[nearbyBtns.length - 1];
      }

      return null;
    });
  }

  // --- Detect if Gemini is currently generating ---
  function isGeminiGenerating() {
    // Signal 1: Any visible button with stop-like semantics
    const allBtns = document.querySelectorAll('button, [role="button"]');
    for (const b of allBtns) {
      if (!isButtonVisible(b)) continue;
      const txt = btnText(b);
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      if (txt === 'stop' || aria === 'stop' || aria === 'stop generating' ||
          aria === 'cancel generation' || txt === 'cancel') {
        return true;
      }
      // Icon-based stop detection
      if (hasIcon(b, ['stop', 'stop_circle', 'cancel', 'pause'])) return true;
    }

    // Signal 2: Progress indicators (multiple selector strategies)
    const spinnerSelectors = [
      'mat-progress-spinner', 'mat-progress-bar',
      '.mat-mdc-progress-spinner', '.mat-mdc-progress-bar',
      '[role="progressbar"]',
      '.spinner', '.loading-indicator',
      'svg.spinner', '.spin'
    ];
    for (const sel of spinnerSelectors) {
      try {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el.offsetParent !== null) return true;
        }
      } catch (_) {}
    }

    // Signal 3: Run button container shows stop state
    // Try multiple possible component names (in case ms-run-button is renamed)
    const runContainers = document.querySelectorAll(
      'ms-run-button, [class*="run-button"], [class*="submit-button"]'
    );
    for (const container of runContainers) {
      if (hasIcon(container, ['stop', 'stop_circle'])) return true;
      // If run button text changed to "stop"
      const innerBtn = container.querySelector('button');
      if (innerBtn) {
        const txt = btnText(innerBtn);
        if (txt === 'stop' || txt === 'cancel') return true;
      }
    }

    // Signal 4: CSS animations on response area (streaming cursor, etc.)
    const animated = document.querySelectorAll(
      '[class*="generating"], [class*="streaming"], [class*="typing"]'
    );
    if (animated.length > 0) return true;

    return false;
  }

  // --- Get the text length of the last model response ---
  function getResponseTextLength() {
    const lastResponse = findLastResponseContainer();
    if (!lastResponse) return 0;
    // Prefer a content sub-container to avoid virtual-scroll noise
    const content = lastResponse.querySelector(
      '.turn-content, .message-content, .response-content, .response-body'
    ) || lastResponse;
    return (content.textContent || '').length;
  }

  function findLastResponseContainer() {
    // Strategy 1: data-turn-role attribute (case-insensitive search)
    const allWithRole = document.querySelectorAll('[data-turn-role]');
    const modelTurns = Array.from(allWithRole).filter(el => {
      const role = (el.getAttribute('data-turn-role') || '').toLowerCase();
      return role === 'model' || role === 'assistant' || role === 'ai' || role === 'gemini';
    });
    if (modelTurns.length > 0) return modelTurns[modelTurns.length - 1];

    // Strategy 2: class-based (case-insensitive substring)
    const classPatterns = [
      '.chat-turn-container.model',
      '[class*="model-turn"]', '[class*="model-response"]',
      '[class*="assistant-turn"]', '[class*="assistant-response"]',
      '[class*="ai-response"]', '[class*="bot-response"]'
    ];
    for (const sel of classPatterns) {
      try {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) return els[els.length - 1];
      } catch (_) {}
    }

    // Strategy 3: data-* attribute patterns
    const dataPatterns = [
      '[data-role="model"]', '[data-role="assistant"]',
      '[data-message-role="model"]', '[data-message-role="assistant"]',
      '[data-author="model"]', '[data-author="assistant"]'
    ];
    for (const sel of dataPatterns) {
      try {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) return els[els.length - 1];
      } catch (_) {}
    }

    // Strategy 4: structural — in a chat-like layout, model responses
    // are siblings alternating with user turns. Find the last turn
    // that is NOT the user's.
    const userTurns = document.querySelectorAll(
      '[data-turn-role="User"], [data-turn-role="user"], ' +
      '[data-role="user"], [class*="user-turn"]'
    );
    if (userTurns.length > 0) {
      const lastUser = userTurns[userTurns.length - 1];
      // The next sibling of the last user turn is likely the model response
      let sibling = lastUser.nextElementSibling;
      // Walk forward to find the last sibling (could be multiple model turns)
      let last = null;
      while (sibling) {
        last = sibling;
        sibling = sibling.nextElementSibling;
      }
      if (last) return last;
    }

    return null;
  }

  // ====== HELPER UTILITIES ======

  function isButtonVisible(btn) {
    return btn.offsetParent !== null &&
           !btn.disabled &&
           btn.getAttribute('aria-disabled') !== 'true';
  }

  // Get the "semantic text" of a button — strip icon ligature noise
  function btnText(btn) {
    // Get direct text, ignoring nested icon spans
    let text = '';
    for (const node of btn.childNodes) {
      if (node.nodeType === 3) { // text node
        text += node.textContent;
      } else if (node.nodeType === 1) { // element
        const tag = node.tagName.toLowerCase();
        const cls = (node.className || '').toString().toLowerCase();
        // Skip icon elements
        if (cls.includes('material-symbols') || cls.includes('mat-icon') ||
            tag === 'mat-icon' || tag === 'svg' || tag === 'canvas' ||
            cls.includes('icon') || cls.includes('command-key')) continue;
        text += node.textContent;
      }
    }
    return text.trim().toLowerCase();
  }

  // Gather searchable text from an element's attributes
  function gatherText(el) {
    return [
      el.getAttribute('placeholder'),
      el.getAttribute('aria-label'),
      el.getAttribute('title'),
      el.getAttribute('formcontrolname'),
      el.getAttribute('name'),
      el.getAttribute('id'),
      el.getAttribute('data-test-id')
    ].filter(Boolean).map(s => s.toLowerCase()).join(' ');
  }

  // Check if any keyword appears in the text
  function matchesAny(text, keywords) {
    return keywords.some(k => text.includes(k));
  }

  // Check if an element or its children contain a specific icon
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

  // Find buttons near a given element (share same container)
  function findNearbyButtons(anchor, buttonPool) {
    // Walk up to find the input area container
    let container = anchor.parentElement;
    for (let i = 0; i < 6 && container; i++) {
      const btns = buttonPool.filter(b => container.contains(b));
      if (btns.length > 0) return btns;
      container = container.parentElement;
    }
    return [];
  }

  // ====== KEYBOARD HANDLERS ======

  // Enter key handler (submit/newline toggle)
  // Shift+Enter = add to queue (always, regardless of enterBehavior)
  document.addEventListener('keydown', (e) => {
    if (!preferenceLoaded) return;
    if (e.key !== 'Enter') return;

    const target = findPromptTextarea(e.target);
    if (!target) return;

    // Shift+Enter → add current textarea content to queue
    if (e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      const msg = target.value.trim();
      if (msg) {
        addToQueue(msg);
        clearTextarea(target);
      }
      return;
    }

    const isEnter = !e.metaKey && !e.ctrlKey && !e.shiftKey;
    const isCmdEnter = e.metaKey || e.ctrlKey;
    const isSubmitKey = enterBehavior === 'submit' ? isEnter : isCmdEnter;
    const isNewlineKey = enterBehavior === 'submit' ? isCmdEnter : isEnter;

    if (isSubmitKey) {
      e.preventDefault();
      e.stopPropagation();
      clickRunButton();
    } else if (isNewlineKey) {
      e.preventDefault();
      e.stopPropagation();
      insertNewline(target);
    }
  }, true);

  // Shared queue function — used by inline button, floating panel, and keyboard shortcut
  function addToQueue(msg) {
    chrome.storage.local.get(['messageQueue'], (data) => {
      const q = data.messageQueue || [];
      q.push(msg);
      chrome.storage.local.set({ messageQueue: q }, () => {
        document.dispatchEvent(new CustomEvent('vidmind-queue-updated'));
      });
    });
  }

  function clearTextarea(textarea) {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    );
    if (setter && setter.set) {
      setter.set.call(textarea, '');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
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

  function insertText(textarea, text) {
    textarea.focus();
    const inserted = document.execCommand('insertText', false, text);
    if (!inserted) {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      ).set;
      setter.call(textarea, text);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // ====== FLOATING QUEUE PANEL ======
  // Two modes: Queue (waits for generation complete) / Steer (sends immediately)
  // Draggable toggle button with persisted position

  let queueMode = 'queue'; // 'queue' | 'steer'

  function initQueueUI() {
    // --- Build DOM ---
    const wrap = document.createElement('div');
    wrap.id = 'vidmind-q-wrap';
    wrap.style.cssText = 'position:fixed;z-index:999999;user-select:none;';

    wrap.innerHTML = `
      <div id="vidmind-q-toggle" style="
        width:40px;height:40px;border-radius:50%;
        background:#1a73e8;color:#fff;font-size:20px;
        display:flex;align-items:center;justify-content:center;
        cursor:grab;box-shadow:0 2px 10px rgba(0,0,0,.3);position:relative;">
        \u23F3
        <span id="vidmind-q-badge" style="
          position:absolute;top:-5px;right:-5px;
          background:#ea4335;color:#fff;font-size:10px;font-weight:700;
          min-width:16px;height:16px;border-radius:8px;
          display:none;align-items:center;justify-content:center;padding:0 3px;"></span>
      </div>
      <div id="vidmind-q-panel" style="
        display:none;width:280px;background:#fff;border-radius:12px;
        box-shadow:0 4px 20px rgba(0,0,0,.2);
        font-family:Google Sans,system-ui,sans-serif;overflow:hidden;
        position:absolute;bottom:48px;right:0;">
        <div id="vidmind-q-header" style="
          padding:8px 14px;background:#1a73e8;color:#fff;font-size:12px;
          font-weight:500;display:flex;align-items:center;gap:6px;">
          <span id="vidmind-q-modelabel" style="flex:1;">\u23F3 Queue Mode</span>
          <span id="vidmind-q-status" style="font-size:10px;opacity:.8;"></span>
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:10px;">
            <span id="vidmind-q-toggle-label">Queue</span>
            <div style="position:relative;width:32px;height:16px;">
              <input type="checkbox" id="vidmind-q-mode" style="opacity:0;width:0;height:0;">
              <div id="vidmind-q-slider" style="
                position:absolute;top:0;left:0;right:0;bottom:0;
                background:rgba(255,255,255,.3);border-radius:8px;cursor:pointer;
                transition:background .2s;"></div>
              <div id="vidmind-q-thumb" style="
                position:absolute;top:2px;left:2px;width:12px;height:12px;
                background:#fff;border-radius:50%;transition:left .2s;"></div>
            </div>
          </label>
        </div>
        <div style="padding:10px;">
          <textarea id="vidmind-q-input" placeholder="Type follow-up question..."
            style="width:100%;height:50px;padding:8px;border:1px solid #dadce0;border-radius:8px;
            font-size:12px;resize:none;box-sizing:border-box;font-family:inherit;"></textarea>
          <button id="vidmind-q-add" style="width:100%;margin-top:6px;padding:7px;
            background:#1a73e8;color:#fff;border:none;border-radius:8px;
            font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;">
            Add to Queue
          </button>
        </div>
        <div id="vidmind-q-list" style="max-height:160px;overflow-y:auto;border-top:1px solid #e8eaed;"></div>
      </div>
    `;

    document.body.appendChild(wrap);

    const toggleBtn = document.getElementById('vidmind-q-toggle');
    const panel = document.getElementById('vidmind-q-panel');
    const badge = document.getElementById('vidmind-q-badge');
    const statusEl = document.getElementById('vidmind-q-status');
    const header = document.getElementById('vidmind-q-header');
    const modeCheckbox = document.getElementById('vidmind-q-mode');
    const modeLabel = document.getElementById('vidmind-q-modelabel');
    const toggleLabel = document.getElementById('vidmind-q-toggle-label');
    const slider = document.getElementById('vidmind-q-slider');
    const thumb = document.getElementById('vidmind-q-thumb');

    // --- Load persisted position ---
    chrome.storage.local.get(['queueTogglePosition'], (data) => {
      const pos = data.queueTogglePosition;
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        const x = Math.max(0, Math.min(pos.x, window.innerWidth - 44));
        const y = Math.max(0, Math.min(pos.y, window.innerHeight - 44));
        wrap.style.left = x + 'px';
        wrap.style.top = y + 'px';
      } else {
        wrap.style.bottom = '120px';
        wrap.style.right = '16px';
      }
    });

    // --- Load persisted mode ---
    chrome.storage.sync.get(['queueMode'], (data) => {
      queueMode = data.queueMode || 'queue';
      applyModeUI();
    });

    function applyModeUI() {
      const isSteer = queueMode === 'steer';
      modeCheckbox.checked = isSteer;
      header.style.background = isSteer ? '#e8710a' : '#1a73e8';
      modeLabel.textContent = isSteer ? '\u26A1 Steer Mode' : '\u23F3 Queue Mode';
      toggleLabel.textContent = isSteer ? 'Steer' : 'Queue';
      thumb.style.left = isSteer ? '18px' : '2px';
      slider.style.background = isSteer ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.3)';
      document.getElementById('vidmind-q-add').textContent =
        isSteer ? 'Send Now' : 'Add to Queue';
      document.getElementById('vidmind-q-add').style.background =
        isSteer ? '#e8710a' : '#1a73e8';
    }

    // --- Mode toggle ---
    modeCheckbox.addEventListener('change', () => {
      queueMode = modeCheckbox.checked ? 'steer' : 'queue';
      chrome.storage.sync.set({ queueMode });
      applyModeUI();
    });
    slider.addEventListener('click', () => { modeCheckbox.checked = !modeCheckbox.checked; modeCheckbox.dispatchEvent(new Event('change')); });
    thumb.addEventListener('click', () => { modeCheckbox.checked = !modeCheckbox.checked; modeCheckbox.dispatchEvent(new Event('change')); });

    // --- Drag toggle button ---
    let dragging = false, dragMoved = false, startX, startY, origX, origY;

    toggleBtn.addEventListener('mousedown', (e) => {
      dragging = true; dragMoved = false;
      startX = e.clientX; startY = e.clientY;
      const rect = wrap.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
      toggleBtn.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
      const newX = Math.max(0, Math.min(origX + dx, window.innerWidth - 44));
      const newY = Math.max(0, Math.min(origY + dy, window.innerHeight - 44));
      wrap.style.left = newX + 'px';
      wrap.style.top = newY + 'px';
      wrap.style.right = 'auto';
      wrap.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      toggleBtn.style.cursor = 'grab';
      if (dragMoved) {
        const rect = wrap.getBoundingClientRect();
        chrome.storage.local.set({
          queueTogglePosition: { x: rect.left, y: rect.top }
        });
      }
    });

    // --- Toggle panel (only if not dragged) ---
    let panelOpen = false;
    toggleBtn.addEventListener('click', () => {
      if (dragMoved) return;
      panelOpen = !panelOpen;
      panel.style.display = panelOpen ? 'block' : 'none';
      if (panelOpen) refreshQueueList();
    });

    // --- Add / Send ---
    document.getElementById('vidmind-q-add').addEventListener('click', () => {
      const input = document.getElementById('vidmind-q-input');
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';

      if (queueMode === 'steer') {
        steerSend(msg);
      } else {
        addToQueue(msg);
        refreshQueueList();
        updateBadge();
        ensureQueueSender();
      }
    });

    document.getElementById('vidmind-q-input').addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        document.getElementById('vidmind-q-add').click();
      }
    }, true);

    // --- Steer Mode: send immediately ---
    function steerSend(msg) {
      statusEl.textContent = 'sending...';
      const textarea = findAnyTextarea();
      if (!textarea) { statusEl.textContent = 'no textarea'; return; }

      textarea.focus();
      setTimeout(() => {
        insertText(textarea, msg);
        setTimeout(() => {
          const btn = findRunButton();
          if (btn) { btn.click(); statusEl.textContent = 'sent!'; }
          else { statusEl.textContent = 'no Run btn'; }
          setTimeout(() => { statusEl.textContent = ''; }, 2000);
        }, 150);
      }, 100);
    }

    // --- Queue Mode: polling-based auto-sender ---
    let queueSenderInterval = null;
    let isSending = false;

    function ensureQueueSender() {
      if (queueSenderInterval) return;
      statusEl.textContent = 'watching...';

      queueSenderInterval = setInterval(() => {
        if (isSending) return;

        chrome.storage.local.get(['messageQueue'], (data) => {
          const q = data.messageQueue || [];
          if (q.length === 0) {
            clearInterval(queueSenderInterval);
            queueSenderInterval = null;
            statusEl.textContent = '';
            return;
          }
          if (isSending) return;

          // Phase A: is generation still running?
          if (isGeminiGenerating()) {
            statusEl.textContent = 'waiting...';
            stabilitySnapshot = null;
            stabilityCount = 0;
            return;
          }

          // Phase B: is response text stable? (no new text for 1s)
          const currentLen = getResponseTextLength();
          statusEl.textContent = 'stable? (' + currentLen + ')';
          checkTextStability(() => {
            if (isSending) return;
            isSending = true;

            const msg = q.shift();
            chrome.storage.local.set({ messageQueue: q });
            statusEl.textContent = 'sending...';

            const textarea = findAnyTextarea();
            if (!textarea) {
              q.unshift(msg);
              chrome.storage.local.set({ messageQueue: q });
              isSending = false;
              return;
            }

            textarea.focus();
            setTimeout(() => {
              insertText(textarea, msg);
              setTimeout(() => {
                const btn = findRunButton();
                if (btn) btn.click();
                refreshQueueList();
                updateBadge();
                statusEl.textContent = q.length > 0 ? 'watching...' : '';
                isSending = false;
              }, 200);
            }, 100);
          });
        });
      }, 500);
    }

    // Phase B: check response text stability
    let stabilitySnapshot = null;
    let stabilityCount = 0;

    function checkTextStability(onStable) {
      const len = getResponseTextLength();
      if (stabilitySnapshot === null || len !== stabilitySnapshot) {
        stabilitySnapshot = len;
        stabilityCount = 0;
        return;
      }
      stabilityCount++;
      if (stabilityCount >= 2) {
        // Stable for 2 consecutive checks (2 * 500ms = 1s)
        stabilitySnapshot = null;
        stabilityCount = 0;
        onStable();
      }
    }

    // --- Queue list ---
    function refreshQueueList() {
      chrome.storage.local.get(['messageQueue'], (data) => {
        const q = data.messageQueue || [];
        const list = document.getElementById('vidmind-q-list');
        if (!list) return;

        if (q.length === 0) {
          list.innerHTML = '<div style="padding:12px;text-align:center;color:#5f6368;font-size:11px;">No queued messages</div>';
          return;
        }

        list.innerHTML = q.map((msg, i) =>
          '<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid #f1f3f4;font-size:11px;">' +
          '<span style="color:#5f6368;">' + (i + 1) + '.</span>' +
          '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' +
            msg.replace(/"/g, '&quot;') + '">' + msg + '</span>' +
          '<span data-del="' + i + '" style="cursor:pointer;color:#ea4335;font-size:14px;padding:0 2px;">\u2715</span>' +
          '</div>'
        ).join('');

        list.querySelectorAll('[data-del]').forEach(el => {
          el.addEventListener('click', () => {
            const idx = parseInt(el.dataset.del);
            chrome.storage.local.get(['messageQueue'], (d) => {
              const arr = d.messageQueue || [];
              arr.splice(idx, 1);
              chrome.storage.local.set({ messageQueue: arr }, () => {
                refreshQueueList(); updateBadge();
              });
            });
          });
        });
      });
    }

    function updateBadge() {
      chrome.storage.local.get(['messageQueue'], (data) => {
        const count = (data.messageQueue || []).length;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
      });
    }

    // --- Init ---
    updateBadge();
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.messageQueue) {
        updateBadge();
        if (panelOpen) refreshQueueList();
      }
    });

    document.addEventListener('vidmind-queue-updated', () => {
      updateBadge();
      if (panelOpen) refreshQueueList();
      ensureQueueSender();
    });

    chrome.storage.local.get(['messageQueue'], (data) => {
      if ((data.messageQueue || []).length > 0) ensureQueueSender();
    });

    // --- Inline Queue Button (next to Run) ---
    injectInlineQueueButton();

    console.log('[VidMind] Queue UI initialized (Queue/Steer modes)');
  }

  // ====== INLINE QUEUE BUTTON ======
  // Injected next to AI Studio's Run button via adaptive DOM discovery

  const QUEUE_ICON_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z"/></svg>';
  const CHECK_ICON_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>';

  function injectInlineQueueButton() {
    const INLINE_ID = 'vidmind-inline-queue-btn';

    function createBtn() {
      if (document.getElementById(INLINE_ID)) return;

      // Adaptive: find the button area near the textarea
      const insertionPoint = findButtonInsertionPoint();
      if (!insertionPoint) return;

      const btn = document.createElement('button');
      btn.id = INLINE_ID;
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Add to Queue (Shift+Enter)');
      btn.title = 'Add to Queue (Shift+Enter)';
      btn.style.cssText = [
        'display:inline-flex;align-items:center;justify-content:center;',
        'width:36px;height:36px;margin-right:4px;',
        'border:1px solid transparent;border-radius:50%;',
        'background:transparent;color:#444746;',
        'cursor:pointer;transition:background .15s;',
        'position:relative;flex-shrink:0;'
      ].join('');
      btn.innerHTML = QUEUE_ICON_SVG;

      btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(68,71,70,.08)'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const textarea = findAnyTextarea();
        if (!textarea) return;
        const msg = textarea.value.trim();
        if (!msg) return;

        addToQueue(msg);
        clearTextarea(textarea);

        // Brief visual feedback
        btn.style.color = '#34a853';
        btn.innerHTML = CHECK_ICON_SVG;
        setTimeout(() => {
          btn.style.color = '#444746';
          btn.innerHTML = QUEUE_ICON_SVG;
        }, 1000);
      });

      insertionPoint.parent.insertBefore(btn, insertionPoint.before);
    }

    function findButtonInsertionPoint() {
      // Strategy 1: Known wrapper + run button component
      const wrapperSelectors = [
        'div.button-wrapper', '.button-wrapper',
        '[class*="button-wrapper"]', '[class*="action-bar"]',
        '[class*="toolbar"]'
      ];
      const runBtnSelectors = [
        'ms-run-button', '[class*="run-button"]',
        '[class*="submit-button"]', '[class*="send-button"]'
      ];

      for (const ws of wrapperSelectors) {
        try {
          const wrapper = document.querySelector(ws);
          if (!wrapper) continue;
          for (const rs of runBtnSelectors) {
            const runHost = wrapper.querySelector(rs);
            if (runHost) return { parent: wrapper, before: runHost };
          }
        } catch (_) {}
      }

      // Strategy 2: Find Run button and use its parent
      const runBtn = findRunButton();
      if (runBtn) {
        // Walk up to find the host component (custom element or wrapper div)
        let host = runBtn;
        for (let i = 0; i < 3; i++) {
          if (host.parentElement && host.parentElement.children.length > 1) {
            return { parent: host.parentElement, before: host };
          }
          host = host.parentElement;
          if (!host) break;
        }
        if (runBtn.parentElement) {
          return { parent: runBtn.parentElement, before: runBtn };
        }
      }

      return null;
    }

    // Observe DOM for SPA navigation — throttled to avoid perf impact
    let createTimer = null;
    function throttledCreate() {
      if (createTimer) return;
      createTimer = setTimeout(() => {
        createTimer = null;
        createBtn();
      }, 300);
    }

    createBtn();
    const observer = new MutationObserver(throttledCreate);
    observer.observe(document.body, { childList: true, subtree: true });

    // SPA route change detection
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(createBtn, 500);
      }
    }, 1000);
  }

  // ====== INIT ======

  chrome.storage.sync.get(['showQueueFloat'], (result) => {
    if (result.showQueueFloat === false) return;
    if (document.body) { initQueueUI(); } else { document.addEventListener('DOMContentLoaded', initQueueUI); }
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync' || !changes.showQueueFloat) return;
    const wrap = document.getElementById('vidmind-q-wrap');
    if (changes.showQueueFloat.newValue === false) {
      if (wrap) wrap.style.display = 'none';
    } else {
      if (wrap) { wrap.style.display = ''; } else { initQueueUI(); }
    }
  });
})();
