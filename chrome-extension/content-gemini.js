// Content script for Google AI Studio
(async function() {
  console.log('[YT2Gemini] Content script loaded at:', new Date().toISOString());
  console.log('[YT2Gemini] Page URL:', window.location.href);

  // Check if there's a pending analysis
  const data = await chrome.storage.local.get('pendingAnalysis');
  console.log('[YT2Gemini] Pending analysis data:', data);

  if (!data.pendingAnalysis) {
    console.log('[YT2Gemini] No pending analysis');
    return;
  }

  const { videoUrl, prompt, timestamp, returnToTabId } = data.pendingAnalysis;

  // Check if analysis is recent (within 30 seconds)
  if (Date.now() - timestamp > 30000) {
    console.log('[YT2Gemini] Analysis expired');
    await chrome.storage.local.remove('pendingAnalysis');
    return;
  }

  console.log('[YT2Gemini] Processing analysis for:', videoUrl);
  console.log('[YT2Gemini] Return to tab:', returnToTabId);

  // Wait for page to fully load
  console.log('[YT2Gemini] Waiting for textarea...');
  await waitForElement('textarea[formcontrolname="promptText"]', 10000);
  console.log('[YT2Gemini] Textarea found!');

  // Find the textarea
  const textarea = document.querySelector('textarea[formcontrolname="promptText"]');
  if (!textarea) {
    console.error('[YT2Gemini] Textarea not found');
    return;
  }

  // Step 1: Paste YouTube URL via clipboard to trigger file loader
  console.log('[YT2Gemini] Step 1: Writing to clipboard...');

  try {
    await navigator.clipboard.writeText(videoUrl);
    console.log('[YT2Gemini] Clipboard write successful');

    // Add human-like delay before focusing
    await sleep(150 + Math.random() * 100);

    textarea.focus();
    await sleep(50 + Math.random() * 50);

    // Use more realistic paste simulation with trusted event
    console.log('[YT2Gemini] Step 2: Simulating paste event...');

    // Set the value directly first (more reliable)
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeInputValueSetter.call(textarea, videoUrl);

    // Then trigger events with isTrusted-like properties
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertFromPaste',
      data: videoUrl
    });
    textarea.dispatchEvent(inputEvent);

    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer()
    });
    pasteEvent.clipboardData.setData('text/plain', videoUrl);
    textarea.dispatchEvent(pasteEvent);

    console.log('[YT2Gemini] YouTube URL pasted, waiting for file loader...');
  } catch (clipboardError) {
    console.error('[YT2Gemini] Clipboard operation failed:', clipboardError);
    console.log('[YT2Gemini] This likely means the tab is not focused/active');

    // If clipboard fails, we can't trigger video loading properly
    // Clear pending analysis and notify user
    await chrome.storage.local.remove('pendingAnalysis');
    alert('Failed to load video. Please ensure the tab is active when analysis starts.');
    return;
  }

  // Wait for file reference to load - smart detection with human-like timing
  console.log('[YT2Gemini] Waiting for video to load...');

  // Add initial human-like delay
  await sleep(300 + Math.random() * 200);

  // Check for video chip/indicator every 150-250ms (more human-like), max 8 seconds
  let videoLoaded = false;
  for (let i = 0; i < 40; i++) {
    await sleep(150 + Math.random() * 100);

    // Check if video chip appeared (various selectors for Gemini's file chips)
    const fileChip = document.querySelector('[data-test-id="file-chip"], .file-chip, [role="button"][aria-label*="video"], [aria-label*="YouTube"]');

    // Or check if textarea value changed (video URL might be replaced with chip)
    const currentTextareaValue = textarea.value;

    if (fileChip || currentTextareaValue !== videoUrl) {
      console.log('[YT2Gemini] Video loaded! (detected in ~' + (i * 200) + 'ms)');
      videoLoaded = true;
      break;
    }
  }

  if (!videoLoaded) {
    console.warn('[YT2Gemini] Video load timeout, continuing anyway...');
  }

  // Human-like buffer after detection
  await sleep(400 + Math.random() * 200);

  // Step 2: Add the analysis prompt after the video loads
  console.log('[YT2Gemini] Step 3: Adding analysis prompt...');

  // Human-like delay before focusing again
  await sleep(200 + Math.random() * 150);

  textarea.focus();
  await sleep(100 + Math.random() * 100);

  const currentValue = textarea.value;
  const newValue = currentValue + '\n\n' + prompt;

  // Use native setter for more realistic behavior
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  nativeInputValueSetter.call(textarea, newValue);

  // Trigger events with realistic timing
  textarea.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertText'
  }));

  await sleep(50 + Math.random() * 50);

  textarea.dispatchEvent(new Event('change', { bubbles: true }));

  console.log('[YT2Gemini] Prompt inserted');

  // Human-like wait for form to update
  await sleep(500 + Math.random() * 300);

  // Find and click the run button
  const runButton = findRunButton();
  if (runButton) {
    console.log('[YT2Gemini] Clicking run button');

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
      console.log('[YT2Gemini] Switching back to tab:', returnToTabId);
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
    console.error('[YT2Gemini] Run button not found');
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
  // Try multiple selectors for the run button
  const selectors = [
    'button[jslog*="250044"]', // Run button with specific jslog
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

  // Fallback: find button with "Run" or progress icon
  const buttons = document.querySelectorAll('button');
  for (const button of buttons) {
    const text = button.textContent.trim();
    if (text === 'Run' || text === 'Stop' || button.querySelector('.material-symbols-outlined')) {
      if (!button.disabled) {
        return button;
      }
    }
  }

  return null;
}

function startHeartbeat() {
  // Keep the page active with aggressive presence simulation
  let heartbeatInterval = setInterval(() => {
    // Check if analysis is still running by looking for Stop button or spinner
    const progressIcon = document.querySelector('.material-symbols-outlined.spin');

    // Find Stop button by checking button text
    let stopButton = null;
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      if (button.textContent.trim() === 'Stop') {
        stopButton = button;
        break;
      }
    }

    if (!stopButton && !progressIcon) {
      console.log('[YT2Gemini] Analysis complete, stopping heartbeat');
      clearInterval(heartbeatInterval);

      // Notify background script that analysis is complete
      chrome.runtime.sendMessage({ action: 'analysisComplete' });
    } else {
      console.log('[YT2Gemini] Heartbeat - analysis in progress');

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
