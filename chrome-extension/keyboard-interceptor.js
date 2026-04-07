// Keyboard interceptor for Gemini AI Studio
// Allows toggling between Enter and Cmd+Enter for submission

(function() {
  console.log('[VidMind] Keyboard interceptor loaded');

  let enterBehavior = 'submit'; // 'newline' or 'submit' - default to submit
  let preferenceLoaded = false;

  // Load saved preference
  chrome.storage.sync.get(['enterBehavior'], (result) => {
    enterBehavior = result.enterBehavior || 'submit';
    preferenceLoaded = true;
    console.log('[VidMind] Enter behavior:', enterBehavior);
  });

  // Listen for preference changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.enterBehavior) {
      enterBehavior = changes.enterBehavior.newValue;
      console.log('[VidMind] Enter behavior changed to:', enterBehavior);
    }
  });

  /**
   * Finds the active prompt textarea using heuristic scoring
   * instead of hardcoded selectors that break on UI changes.
   */
  function findPromptTextarea(target) {
    if (target.tagName !== 'TEXTAREA') return null;

    // Must be visible
    if (!target.offsetParent || target.getBoundingClientRect().height === 0) return null;

    let score = 0;
    const placeholder = (target.getAttribute('placeholder') || '').toLowerCase();
    const ariaLabel = (target.getAttribute('aria-label') || '').toLowerCase();
    const formControl = (target.getAttribute('formcontrolname') || '').toLowerCase();

    if (placeholder.includes('prompt') || placeholder.includes('type') || placeholder.includes('ask')) score += 3;
    if (ariaLabel.includes('prompt') || ariaLabel.includes('chat') || ariaLabel.includes('input')) score += 3;
    if (formControl.includes('prompt')) score += 3;
    if (target.hasAttribute('cdktextareaautosize')) score += 2;

    // If it's a textarea on aistudio.google.com, give it a baseline score
    if (window.location.hostname.includes('aistudio.google.com')) score += 1;

    return score > 0 ? target : null;
  }

  // Intercept keyboard events on the textarea
  document.addEventListener('keydown', (e) => {
    // Don't intercept until preferences are loaded
    if (!preferenceLoaded) return;

    const target = findPromptTextarea(e.target);
    if (!target) return;

    const isEnter = e.key === 'Enter';
    const isCmdEnter = (e.metaKey || e.ctrlKey) && e.key === 'Enter';

    if (enterBehavior === 'submit') {
      // Enter submits, Cmd+Enter adds newline
      if (isEnter && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        clickRunButton();
      } else if (isCmdEnter) {
        e.preventDefault();
        e.stopPropagation();
        insertNewline(target);
      }
    } else {
      // Enter adds newline (default), Cmd+Enter submits
      if (isCmdEnter) {
        e.preventDefault();
        e.stopPropagation();
        clickRunButton();
      }
      // Let Enter work normally for newline
    }
  }, true); // Use capture phase to intercept before Gemini's handlers

  function clickRunButton() {
    const runButton = findRunButton();
    if (runButton && !runButton.disabled) {
      console.log('[VidMind] Triggering run button via keyboard');
      runButton.click();
    } else {
      console.log('[VidMind] Run button not available');
    }
  }

  function insertNewline(textarea) {
    // Try execCommand first (most compatible with Angular)
    const inserted = document.execCommand('insertText', false, '\n');
    if (inserted) return;

    // Fallback: manual insertion with null safety
    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    );
    if (!descriptor || !descriptor.set) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const newValue = value.substring(0, start) + '\n' + value.substring(end);

    descriptor.set.call(textarea, newValue);

    // Trigger input event
    textarea.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertLineBreak'
    }));

    // Move cursor after newline
    textarea.selectionStart = textarea.selectionEnd = start + 1;
  }

  /**
   * Finds the Run/Submit button using heuristic search.
   * Matches the approach in content-gemini.js for consistency.
   */
  function findRunButton() {
    // Try known selectors first (may still work)
    const knownSelectors = [
      'button[jslog*="250044"]',
      'button[jslog*="225921"]',
      'ms-run-button button',
      'button.ctrl-enter-submits'
    ];

    for (const selector of knownSelectors) {
      try {
        const button = document.querySelector(selector);
        if (button && isButtonActive(button)) {
          return button;
        }
      } catch (e) {
        // Selector might not be valid
      }
    }

    // Heuristic search: text content, aria-label, material icons
    const allButtons = document.querySelectorAll('button, [role="button"]');
    for (const button of allButtons) {
      if (!isButtonActive(button)) continue;

      const text = (button.textContent || '').trim().toLowerCase();
      const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
      const title = (button.getAttribute('title') || '').toLowerCase();

      // Text match
      if (text === 'run' || text === 'submit' || text === 'send') return button;
      if (ariaLabel === 'run' || ariaLabel === 'submit' || ariaLabel === 'send message') return button;
      if (title === 'run' || title === 'submit' || title === 'send') return button;

      // Material icon match
      const hasRunIcon = Array.from(button.querySelectorAll('.material-symbols-outlined, mat-icon'))
        .some(icon => {
          const iconText = (icon.textContent || '').trim().toLowerCase();
          return iconText === 'send' || iconText === 'play_arrow' || iconText === 'arrow_upward';
        });

      if (hasRunIcon) return button;
    }

    return null;
  }

  function isButtonActive(button) {
    return !button.disabled &&
           button.getAttribute('aria-disabled') !== 'true' &&
           button.offsetParent !== null;
  }
})();
