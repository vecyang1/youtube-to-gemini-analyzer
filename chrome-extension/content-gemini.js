// Content script for Google AI Studio
(async function() {
  console.log('[VidMind] Content script loaded at:', new Date().toISOString());
  console.log('[VidMind] Page URL:', window.location.href);

  // Check if there's a pending analysis
  const data = await chrome.storage.local.get('pendingAnalysis');
  console.log('[VidMind] Pending analysis data:', data);

  if (!data.pendingAnalysis) {
    console.log('[VidMind] No pending analysis');
    return;
  }

  const { videoUrl, prompt, timestamp, returnToTabId } = data.pendingAnalysis;

  // Check if analysis is recent (within 30 seconds)
  if (Date.now() - timestamp > 30000) {
    console.log('[VidMind] Analysis expired');
    await chrome.storage.local.remove('pendingAnalysis');
    return;
  }

  console.log('[VidMind] Processing analysis for:', videoUrl);
  console.log('[VidMind] Return to tab:', returnToTabId);

  // Wait for the visible prompt textarea to fully load
  console.log('[VidMind] Waiting for visible textarea to load...');
  let textarea = null;
  for (let i = 0; i < 30; i++) { // wait up to 15 seconds (30 * 500ms)
    textarea = findHeuristicTextarea();
    if (textarea) break;
    await sleep(500);
  }

  if (!textarea) {
    console.error('[VidMind] Timeout: Heuristic search failed to find visible textarea');
    return;
  }
  console.log('[VidMind] Visible textarea found!');


  // Step 1: Paste YouTube URL to trigger file loader
  console.log('[VidMind] Step 1: Inserting YouTube URL...');

  try {
    // Try clipboard first (works if tab is focused)
    await navigator.clipboard.writeText(videoUrl);
    console.log('[VidMind] Clipboard write successful');
  } catch (clipboardError) {
    console.log('[VidMind] Clipboard unavailable (tab not focused), using direct insertion');
  }

  // Add human-like delay before focusing
  await sleep(150 + Math.random() * 100);

  textarea.focus();
  await sleep(50 + Math.random() * 50);

  // Use more realistic paste simulation with trusted event
  console.log('[VidMind] Step 2: Simulating paste event...');

  // Set the value directly. execCommand simulates the most realistic user input.
  const insertedVideo = document.execCommand('insertText', false, videoUrl);
  if (!insertedVideo) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, videoUrl);

    // Then trigger events with standard properties that Angular understands
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: new DataTransfer()
  });
  pasteEvent.clipboardData.setData('text/plain', videoUrl);
  textarea.dispatchEvent(pasteEvent);

  console.log('[VidMind] YouTube URL inserted, waiting for file loader...');

  // Wait for file reference to load - smart detection with human-like timing
  console.log('[VidMind] Waiting for video to load...');

  // Add initial human-like delay
  await sleep(300 + Math.random() * 200);

  // Check for video chip/indicator every 150-250ms (more human-like), max 8 seconds
  let videoLoaded = false;
  for (let i = 0; i < 40; i++) {
    await sleep(150 + Math.random() * 100);

    // Check if video chip appeared heuristically (look for elements containing video related info or icons near the input)
    const fileChip = document.querySelector('mat-chip, .mat-mdc-chip, [role="button"][aria-label*="video"], [aria-label*="YouTube"], [data-test-id*="chip"], [data-test-id*="file"]');

    // Or check if textarea value changed (video URL might be replaced with chip)
    const currentTextareaValue = textarea.value;

    if (fileChip || currentTextareaValue !== videoUrl) {
      console.log('[VidMind] Video loaded! (detected in ~' + (i * 200) + 'ms)');
      videoLoaded = true;
      break;
    }
  }

  if (!videoLoaded) {
    console.warn('[VidMind] Video load timeout, continuing anyway...');
  }

  // Human-like buffer after detection
  await sleep(400 + Math.random() * 200);

  // Step 2: Add the analysis prompt after the video loads
  console.log('[VidMind] Step 3: Adding analysis prompt...');

  // Human-like delay before focusing again
  await sleep(200 + Math.random() * 150);

  textarea.focus();
  await sleep(100 + Math.random() * 100);

  const newValue = '\n\n' + prompt;

  // Set the value directly. execCommand simulates most realistic user input.
  const insertedPrompt = document.execCommand('insertText', false, newValue);
  if (!insertedPrompt) {
    const currentValue = textarea.value;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, currentValue + newValue);

    // Trigger standard events with realistic timing
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  await sleep(50 + Math.random() * 50);

  textarea.dispatchEvent(new Event('change', { bubbles: true }));

  console.log('[VidMind] Prompt inserted');

  // Human-like wait for form to update
  await sleep(500 + Math.random() * 300);

  // Find and click the run button - wait until it is actually active
  let runButton = null;
  for (let i = 0; i < 20; i++) {
    runButton = findRunButton();
    if (runButton) {
      break;
    }
    await sleep(100);
  }

  if (runButton) {
    console.log('[VidMind] Clicking run button');

    // Add human-like delay before clicking
    await sleep(200 + Math.random() * 200);

    // Simulate mouse movement to button (more realistic)
    const rect = runButton.getBoundingClientRect();
    const mouseX = rect.left + rect.width / 2 + (Math.random() - 0.5) * 10;
    const mouseY = rect.top + rect.height / 2 + (Math.random() - 0.5) * 10;

    runButton.dispatchEvent(new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: mouseX,
      clientY: mouseY
    }));

    await sleep(50 + Math.random() * 50);

    runButton.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: mouseX,
      clientY: mouseY,
      button: 0
    }));

    await sleep(30 + Math.random() * 30);

    runButton.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: mouseX,
      clientY: mouseY,
      button: 0
    }));

    runButton.click();

    // Notify background script that analysis started
    chrome.runtime.sendMessage({ action: 'analysisStarted' });

    // If we should return to previous tab, do it after a longer delay
    if (returnToTabId) {
      console.log('[VidMind] Switching back to tab:', returnToTabId);
      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: 'switchToTab',
          tabId: returnToTabId
        });
      }, 2000); // Increased to 2000ms to allow AI Studio to fully initialize
    }

    // Start heartbeat to keep connection alive
    startHeartbeat();
  } else {
    console.error('[VidMind] Run button not found');
  }

  // Clear pending analysis
  await chrome.storage.local.remove('pendingAnalysis');
})();

// Listen for keepalive pings from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'keepalive') {
    // Respond to keepalive to show tab is active
    sendResponse({ alive: true });
    return true;
  }
});

function findRunButton() {
  // Try standard selectors first
  const exactSelectors = [
    'button[jslog*="250044"]', // Historic Run button
    'button[jslog*="225921"]', // Newer Run button
    'ms-run-button button',
    'button.ctrl-enter-submits'
  ];

  for (const selector of exactSelectors) {
    try {
      const button = document.querySelector(selector);
      if (button && isButtonActive(button)) {
        return button;
      }
    } catch (e) {}
  }

  // Heuristic search: Find any button that looks or acts like a "Submit/Run" button near the prompt box
  return findHeuristicRunButton();
}

/**
 * Checks if a button is visibly enabled (both native and ARIA attributes)
 */
function isButtonActive(button) {
  return !button.disabled && 
         button.getAttribute('aria-disabled') !== 'true' && 
         button.offsetParent !== null; // It must be visible
}

/**
 * Intelligently searches the DOM for the active input textarea based on visual and semantic hints
 * rather than hardcoded attributes which change frequently.
 */
function findHeuristicTextarea() {
  const allTextareas = Array.from(document.querySelectorAll('textarea'));
  
  // Filter 1: Must be visible on screen
  const visibleTextareas = allTextareas.filter(t => t.offsetParent !== null && t.getBoundingClientRect().height > 0);
  
  if (visibleTextareas.length === 1) return visibleTextareas[0];
  
  // Filter 2: Score them based on semantic hints
  let bestScore = -1;
  let bestTextarea = null;
  
  for (const t of visibleTextareas) {
    let score = 0;
    
    // Look at placeholders
    const placeholder = (t.getAttribute('placeholder') || '').toLowerCase();
    if (placeholder.includes('prompt') || placeholder.includes('type') || placeholder.includes('ask')) score += 5;
    
    // Look at ARIA labels
    const ariaLabel = (t.getAttribute('aria-label') || '').toLowerCase();
    if (ariaLabel.includes('prompt') || ariaLabel.includes('chat') || ariaLabel.includes('input')) score += 5;
    
    // Look at existing forms/containers
    const formControl = (t.getAttribute('formcontrolname') || '').toLowerCase();
    if (formControl.includes('prompt')) score += 3;
    
    // Most likely it"s editable and autosizing
    if (t.hasAttribute('cdktextareaautosize')) score += 2;
    
    if (score > bestScore) {
      bestScore = score;
      bestTextarea = t;
    }
  }
  
  return bestScore >= 0 ? bestTextarea : (visibleTextareas[visibleTextareas.length - 1] || null);
}

/**
 * Intelligently searches for the "Run/Submit" button based on icons and semantic text.
 */
function findHeuristicRunButton() {
  const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
  const activeButtons = allButtons.filter(isButtonActive);
  
  for (const b of activeButtons) {
    const text = (b.textContent || '').trim().toLowerCase();
    const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
    const title = (b.getAttribute('title') || '').toLowerCase();
    
    // Does it textually say "Run" or "Submit"?
    if (text === 'run' || text === 'submit' || text === 'send') return b;
    if (ariaLabel === 'run' || ariaLabel === 'submit' || ariaLabel === 'send message') return b;
    if (title === 'run' || title === 'submit' || title === 'send') return b;
    
    // Does it contain a send/play icon?
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
  // Keep the page active with aggressive presence simulation
  let heartbeatInterval = setInterval(() => {
    // Check if analysis is still running heuristically
    
    // 1. Look for a spinning/animated indicator near buttons
    const animatedElements = document.querySelectorAll('.spin, [style*="animation"], svg animateTransform, mat-progress-spinner');
    const isSpinning = animatedElements.length > 0;

    // 2. Look for a Stop button among all buttons
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
      console.log('[VidMind] Analysis complete (no Stop button or spinner found), stopping heartbeat');
      clearInterval(heartbeatInterval);

      // Notify background script that analysis is complete
      chrome.runtime.sendMessage({ action: 'analysisComplete' });
    } else {
      console.log('[VidMind] Heartbeat - analysis in progress');

      // Aggressive presence simulation to prevent tab throttling
      // Simulate mouse movement
      document.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: Math.random() * window.innerWidth,
        clientY: Math.random() * window.innerHeight
      }));

      // Simulate scroll activity
      window.dispatchEvent(new Event('scroll'));

      // Touch the textarea to show activity
      const textarea = document.querySelector('textarea[formcontrolname="promptText"]');
      if (textarea) {
        textarea.dispatchEvent(new Event('focus', { bubbles: true }));
      }

      // Request animation frame to keep rendering active
      requestAnimationFrame(() => {});
    }
  }, 2000); // Every 2 seconds for more aggressive presence
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
