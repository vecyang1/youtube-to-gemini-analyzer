// Keyboard interceptor for Gemini AI Studio
// Supports Enter/Cmd+Enter toggle for submit/newline

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
        // Clear textarea
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        );
        if (setter && setter.set) {
          setter.set.call(target, '');
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
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
        // Dispatch custom event so queue UI can react
        document.dispatchEvent(new CustomEvent('vidmind-queue-updated'));
      });
    });
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

  // ====== Floating Queue Panel ======
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
        // Clamp to viewport
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
    // Click the slider/thumb area
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
        // Persist position
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
        const inserted = document.execCommand('insertText', false, msg);
        if (!inserted) {
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, 'value'
          ).set;
          setter.call(textarea, msg);
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        setTimeout(() => {
          const btn = findRunButton();
          if (btn) { btn.click(); statusEl.textContent = 'sent!'; }
          else { statusEl.textContent = 'no Run btn'; }
          setTimeout(() => { statusEl.textContent = ''; }, 2000);
        }, 150);
      }, 100);
    }

    // --- Queue Mode: polling-based auto-sender ---
    // Uses setInterval (NOT MutationObserver) to avoid DOM-change false positives.
    // Two-phase detection: Stop button gone → response text stable for 1s.
    let queueSenderInterval = null;
    let isSending = false; // mutex

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
            // Reset stability when generating so Phase B starts fresh after gen ends
            stabilitySnapshot = null;
            stabilityCount = 0;
            return;
          }

          // Phase B: is response text stable? (no new text for 1s)
          const currentLen = getResponseTextLength();
          statusEl.textContent = 'checking... (' + currentLen + ')';
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
              const inserted = document.execCommand('insertText', false, msg);
              if (!inserted) {
                const setter = Object.getOwnPropertyDescriptor(
                  window.HTMLTextAreaElement.prototype, 'value'
                ).set;
                setter.call(textarea, msg);
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
              }
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

    // Phase B: check response text stability — no new characters for 1 second
    let stabilitySnapshot = null;
    let stabilityCount = 0;

    function checkTextStability(onStable) {
      const len = getResponseTextLength();
      if (stabilitySnapshot === null || len !== stabilitySnapshot) {
        // Text changed or first check — reset
        stabilitySnapshot = len;
        stabilityCount = 0;
        return; // will re-check on next poll cycle
      }
      // Text same as last check
      stabilityCount++;
      if (stabilityCount >= 2) {
        // Stable for 2 consecutive checks (2 * 500ms = 1s)
        stabilitySnapshot = null;
        stabilityCount = 0;
        onStable();
      }
    }

    function getResponseTextLength() {
      // Find the last model response turn — note capital "Model" in AI Studio DOM
      const responses = document.querySelectorAll(
        '[data-turn-role="Model"], .chat-turn-container.model'
      );
      if (responses.length === 0) return 0;
      const last = responses[responses.length - 1];
      // Prefer .turn-content to avoid virtual-scroll spacer noise
      const content = last.querySelector('.turn-content');
      return ((content || last).textContent || '').length;
    }

    function isGeminiGenerating() {
      // Check 1: Stop button visible
      const buttons = document.querySelectorAll('button, [role="button"]');
      for (const b of buttons) {
        const text = (b.textContent || '').trim().toLowerCase();
        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
        if ((text === 'stop' || aria === 'stop' || aria === 'stop generating') &&
            !b.disabled && b.offsetParent !== null) return true;
      }
      // Check 2: Animated spinners / progress indicators (same as content-gemini.js)
      const spinners = document.querySelectorAll(
        '.spin, mat-progress-spinner, mat-progress-bar, [role="progressbar"], ' +
        '.mat-mdc-progress-spinner'
      );
      for (const el of spinners) {
        if (el.offsetParent !== null) return true;
      }
      // Check 3: Run button shows stop icon (ms-run-button may swap icon during gen)
      const runBtnContainer = document.querySelector('ms-run-button');
      if (runBtnContainer) {
        const icons = runBtnContainer.querySelectorAll('.material-symbols-outlined, mat-icon');
        for (const icon of icons) {
          const t = (icon.textContent || '').trim().toLowerCase();
          if (t === 'stop' || t === 'stop_circle') return true;
        }
      }
      return false;
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

    // Listen for queue updates from keyboard shortcut or inline button
    document.addEventListener('vidmind-queue-updated', () => {
      updateBadge();
      if (panelOpen) refreshQueueList();
      ensureQueueSender();
    });

    // Resume auto-sender if queued messages exist
    chrome.storage.local.get(['messageQueue'], (data) => {
      if ((data.messageQueue || []).length > 0) ensureQueueSender();
    });

    // --- Inline Queue Button (next to Run) ---
    injectInlineQueueButton();

    console.log('[VidMind] Queue UI initialized (Queue/Steer modes)');
  }

  // Inject a "Q+" button into AI Studio's button-wrapper (next to Run)
  function injectInlineQueueButton() {
    const INLINE_ID = 'vidmind-inline-queue-btn';

    function createBtn() {
      if (document.getElementById(INLINE_ID)) return; // already injected

      const wrapper = document.querySelector('div.button-wrapper, .button-wrapper');
      if (!wrapper) return;

      const runBtnHost = wrapper.querySelector('ms-run-button');
      if (!runBtnHost) return;

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
        'position:relative;'
      ].join('');
      // Inline SVG — playlist_add icon (clean, no font dependency)
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z"/></svg>';

      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(68,71,70,.08)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent';
      });

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const textarea = findAnyTextarea();
        if (!textarea) return;
        const msg = textarea.value.trim();
        if (!msg) return;

        addToQueue(msg);

        // Clear textarea
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        );
        if (setter && setter.set) {
          setter.set.call(textarea, '');
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Brief visual feedback — green check
        btn.style.color = '#34a853';
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>';
        setTimeout(() => {
          btn.style.color = '#444746';
          btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z"/></svg>';
        }, 1000);
      });

      // Insert before Run button
      wrapper.insertBefore(btn, runBtnHost);
    }

    // AI Studio is SPA — button-wrapper may not exist yet. Observe + retry.
    createBtn();
    const observer = new MutationObserver(() => { createBtn(); });
    observer.observe(document.body, { childList: true, subtree: true });

    // Also re-check on navigation (SPA route changes)
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(createBtn, 500);
      }
    }, 1000);
  }

  function findAnyTextarea() {
    const all = Array.from(document.querySelectorAll('textarea'));
    return all.find(t => t.offsetParent !== null && t.getBoundingClientRect().height > 0) || null;
  }

  // Only show if enabled in settings
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
