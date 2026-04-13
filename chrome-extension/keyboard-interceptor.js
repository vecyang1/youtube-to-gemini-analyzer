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
  document.addEventListener('keydown', (e) => {
    if (!preferenceLoaded) return;
    if (e.key !== 'Enter') return;

    const target = findPromptTextarea(e.target);
    if (!target) return;

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
  // Always-visible toggle button → expands to queue panel
  function initQueueUI() {
    // Toggle button (always visible)
    const toggle = document.createElement('div');
    toggle.id = 'vidmind-q-toggle';
    toggle.innerHTML = '\u23F3';
    toggle.title = 'VidMind Queue';
    toggle.style.cssText =
      'position:fixed;bottom:120px;right:16px;z-index:999999;' +
      'width:36px;height:36px;border-radius:50%;' +
      'background:#1a73e8;color:#fff;font-size:18px;' +
      'display:flex;align-items:center;justify-content:center;' +
      'cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);' +
      'transition:transform .15s;user-select:none;';

    // Badge count
    const badge = document.createElement('span');
    badge.id = 'vidmind-q-badge';
    badge.style.cssText =
      'position:absolute;top:-4px;right:-4px;' +
      'background:#ea4335;color:#fff;font-size:10px;font-weight:700;' +
      'min-width:16px;height:16px;border-radius:8px;' +
      'display:none;align-items:center;justify-content:center;padding:0 3px;';
    toggle.appendChild(badge);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'vidmind-q-panel';
    panel.style.cssText =
      'position:fixed;bottom:164px;right:16px;z-index:999999;' +
      'width:280px;background:#fff;border-radius:12px;' +
      'box-shadow:0 4px 20px rgba(0,0,0,.2);display:none;' +
      'font-family:Google Sans,system-ui,sans-serif;overflow:hidden;';

    panel.innerHTML = `
      <div style="padding:10px 14px;background:#1a73e8;color:#fff;font-size:13px;font-weight:500;">
        \u23F3 Message Queue
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
    `;

    document.body.appendChild(toggle);
    document.body.appendChild(panel);

    // Toggle panel
    let panelOpen = false;
    toggle.addEventListener('click', () => {
      panelOpen = !panelOpen;
      panel.style.display = panelOpen ? 'block' : 'none';
      toggle.style.transform = panelOpen ? 'scale(1.1)' : 'scale(1)';
      if (panelOpen) refreshQueueList();
    });

    // Add button
    document.getElementById('vidmind-q-add').addEventListener('click', () => {
      const input = document.getElementById('vidmind-q-input');
      const msg = input.value.trim();
      if (!msg) return;

      chrome.storage.local.get(['messageQueue'], (data) => {
        const q = data.messageQueue || [];
        q.push(msg);
        chrome.storage.local.set({ messageQueue: q }, () => {
          input.value = '';
          refreshQueueList();
          updateBadge();
          chrome.runtime.sendMessage({ action: 'startQueueMonitor' });
        });
      });
    });

    // Cmd/Ctrl+Enter to add
    document.getElementById('vidmind-q-input').addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('vidmind-q-add').click();
      }
    }, true);

    // Refresh list
    function refreshQueueList() {
      chrome.storage.local.get(['messageQueue'], (data) => {
        const q = data.messageQueue || [];
        const list = document.getElementById('vidmind-q-list');
        if (!list) return;

        if (q.length === 0) {
          list.innerHTML = '<div style="padding:12px;text-align:center;color:#5f6368;font-size:11px;">No queued messages</div>';
          return;
        }

        list.innerHTML = q.map((msg, i) => `
          <div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid #f1f3f4;font-size:11px;">
            <span style="color:#5f6368;">${i + 1}.</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${msg.replace(/"/g, '&quot;')}">${msg}</span>
            <span data-del="${i}" style="cursor:pointer;color:#ea4335;font-size:14px;padding:0 2px;">\u2715</span>
          </div>
        `).join('');

        list.querySelectorAll('[data-del]').forEach(el => {
          el.addEventListener('click', () => {
            const idx = parseInt(el.dataset.del);
            chrome.storage.local.get(['messageQueue'], (d) => {
              const arr = d.messageQueue || [];
              arr.splice(idx, 1);
              chrome.storage.local.set({ messageQueue: arr }, () => {
                refreshQueueList();
                updateBadge();
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

    // Poll badge count
    updateBadge();
    setInterval(updateBadge, 3000);

    // Also refresh list when storage changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.messageQueue) {
        updateBadge();
        if (panelOpen) refreshQueueList();
      }
    });

    console.log('[VidMind] Queue UI injected');
  }

  // Inject after a short delay to ensure body is ready
  if (document.body) {
    initQueueUI();
  } else {
    document.addEventListener('DOMContentLoaded', initQueueUI);
  }
})();
