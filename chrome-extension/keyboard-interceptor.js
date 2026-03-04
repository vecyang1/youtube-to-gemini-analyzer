// Keyboard interceptor for Gemini AI Studio
// Allows toggling between Enter and Cmd+Enter for submission

(function() {
  console.log('[VidMind] Keyboard interceptor loaded');

  let enterBehavior = 'submit'; // 'newline' or 'submit' - default to submit

  // Load saved preference
  chrome.storage.sync.get(['enterBehavior'], (result) => {
    enterBehavior = result.enterBehavior || 'submit';
    console.log('[VidMind] Enter behavior:', enterBehavior);
  });

  // Listen for preference changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.enterBehavior) {
      enterBehavior = changes.enterBehavior.newValue;
      console.log('[VidMind] Enter behavior changed to:', enterBehavior);
    }
  });

  // Intercept keyboard events on the textarea
  document.addEventListener('keydown', (e) => {
    // Only handle events on the prompt textarea
    const target = e.target;
    if (!target.matches('textarea[formcontrolname="promptText"]')) {
      return;
    }

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
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    // Insert newline at cursor position
    const newValue = value.substring(0, start) + '\n' + value.substring(end);

    // Use native setter
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    ).set;
    nativeInputValueSetter.call(textarea, newValue);

    // Trigger input event
    textarea.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertLineBreak'
    }));

    // Move cursor after newline
    textarea.selectionStart = textarea.selectionEnd = start + 1;
  }

  function findRunButton() {
    // Try multiple selectors for the run button
    const selectors = [
      'button[jslog*="250044"]',
      'ms-run-button button',
      'button.ctrl-enter-submits'
    ];

    for (const selector of selectors) {
      try {
        const button = document.querySelector(selector);
        if (button && !button.disabled) {
          return button;
        }
      } catch (e) {
        // Selector might not be valid, continue
      }
    }

    // Fallback: find button with "Run" text
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      const text = button.textContent.trim();
      if (text === 'Run' && !button.disabled) {
        return button;
      }
    }

    return null;
  }
})();
