// VidMind Custom Prompt Modal
// Injected into YouTube pages via background.js on Cmd+Shift+X

(function() {
  // Prevent multiple injections using a robust check
  if (document.getElementById('vidmind-prompt-overlay')) return;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'vidmind-prompt-overlay';

  // Create container
  const container = document.createElement('div');
  container.id = 'vidmind-prompt-container';

  // Header
  const header = document.createElement('div');
  header.id = 'vidmind-prompt-header';

  const title = document.createElement('h3');
  title.id = 'vidmind-prompt-title';
  title.textContent = chrome.i18n.getMessage('modalTitle') || 'Ask VidMind';

  header.appendChild(title);

  // Body
  const body = document.createElement('div');
  body.id = 'vidmind-prompt-body';

  const textarea = document.createElement('textarea');
  textarea.id = 'vidmind-prompt-textarea';
  textarea.placeholder = chrome.i18n.getMessage('modalPlaceholder') || 'What do you want to know about this video?';

  body.appendChild(textarea);

  // Footer
  const footer = document.createElement('div');
  footer.id = 'vidmind-prompt-footer';

  const hint = document.createElement('div');
  hint.className = 'vidmind-shortcut-hint';
  hint.textContent = chrome.i18n.getMessage('modalKeyboardHint') || 'Enter to submit, Shift+Enter for newline, Esc to cancel';

  const btnGroup = document.createElement('div');
  btnGroup.className = 'vidmind-btn-group';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'vidmind-btn vidmind-btn-cancel';
  cancelBtn.textContent = chrome.i18n.getMessage('modalBtnCancel') || 'Cancel';

  const submitBtn = document.createElement('button');
  submitBtn.className = 'vidmind-btn vidmind-btn-submit';
  submitBtn.textContent = chrome.i18n.getMessage('modalBtnAnalyze') || 'Analyze';

  btnGroup.appendChild(cancelBtn);
  btnGroup.appendChild(submitBtn);

  footer.appendChild(hint);
  footer.appendChild(btnGroup);

  // Assemble
  container.appendChild(header);
  container.appendChild(body);
  container.appendChild(footer);
  overlay.appendChild(container);

  // Append to body
  document.body.appendChild(overlay);

  // Focus textarea after animation settles
  setTimeout(() => textarea.focus(), 120);

  // Event Handlers
  function closeModal() {
    overlay.style.animation = 'vidmindFadeIn 0.25s ease-out reverse';
    container.style.animation = 'vidmindSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) reverse';

    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 220);
  }

  function submitPrompt() {
    const promptText = textarea.value.trim();
    if (!promptText) {
      // Shake animation for empty input
      container.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(0)' }
      ], { duration: 400 });
      textarea.focus();
      return;
    }

    // Disable submit and show sending state
    submitBtn.textContent = chrome.i18n.getMessage('modalBtnSending') || 'Sending...';
    submitBtn.style.opacity = '0.7';
    submitBtn.disabled = true;

    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'analyzeWithCustomPrompt',
      videoUrl: window.location.href,
      videoTitle: document.title.replace(' - YouTube', ''),
      prompt: promptText
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[VidMind] Error sending custom prompt:', chrome.runtime.lastError);
        // Reset button on error
        submitBtn.textContent = chrome.i18n.getMessage('modalBtnAnalyze') || 'Analyze';
        submitBtn.style.opacity = '1';
        submitBtn.disabled = false;
        return;
      }
      closeModal();
    });
  }

  cancelBtn.addEventListener('click', closeModal);
  submitBtn.addEventListener('click', submitPrompt);

  // Close on overlay click (outside container)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  // Keyboard shortcuts
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitPrompt();
    }
  });
})();
