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
})();
