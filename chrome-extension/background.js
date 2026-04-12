// Import centralized prompts
importScripts('prompts.js');

// Track active analysis tabs to keep them alive
let activeAnalysisTabs = new Set();

// --- Context Menu Setup ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'vidmind-analyze-link',
    title: 'Analyze with VidMind',
    contexts: ['link'],
    targetUrlPatterns: [
      '*://www.youtube.com/watch*',
      '*://youtube.com/watch*',
      '*://youtu.be/*',
      '*://m.youtube.com/watch*'
    ]
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'vidmind-analyze-link') {
    const url = info.linkUrl;
    if (url) {
      // Normalize youtu.be short links to full URL
      const normalizedUrl = normalizeYouTubeUrl(url);
      if (normalizedUrl) {
        handleVideoAnalysis(normalizedUrl);
      }
    }
  }
});

function normalizeYouTubeUrl(url) {
  try {
    const parsed = new URL(url);
    // Handle youtu.be short links
    if (parsed.hostname === 'youtu.be') {
      const videoId = parsed.pathname.slice(1);
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    // Handle m.youtube.com
    if (parsed.hostname === 'm.youtube.com') {
      parsed.hostname = 'www.youtube.com';
      return parsed.toString();
    }
    return url;
  } catch {
    return null;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeVideo') {
    handleVideoAnalysis(request.videoUrl, request.prompt)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'analyzeWithCustomPrompt') {
    handleVideoAnalysis(request.videoUrl, request.prompt, request.videoTitle)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'analysisStarted') {
    if (sender.tab?.id) {
      activeAnalysisTabs.add(sender.tab.id);
      console.log('[VidMind] Tracking analysis tab:', sender.tab.id);
    }
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'analysisComplete') {
    if (sender.tab?.id) {
      activeAnalysisTabs.delete(sender.tab.id);
      console.log('[VidMind] Analysis complete for tab:', sender.tab.id);

      // Update completion in history
      updateHistoryCompletion(sender.tab.id);

      // Notify user that analysis is complete
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: chrome.i18n.getMessage('extensionName') || 'VidMind',
        message: chrome.i18n.getMessage('statusSuccess') || 'Video analysis finished. Check Google AI Studio tab.',
        priority: 2
      });
    }
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'switchToTab') {
    // Switch back to the original tab
    if (request.tabId) {
      chrome.tabs.update(request.tabId, { active: true }).catch(err => {
        console.error('[VidMind] Failed to switch tab:', err);
      });
    }
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'getHistory') {
    getAnalysisHistory()
      .then(history => sendResponse({ success: true, history }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'getStats') {
    getUsageStats()
      .then(stats => sendResponse({ success: true, stats }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'clearHistory') {
    chrome.storage.local.set({ analysisHistory: [] }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'startQueueMonitor') {
    startQueueMonitor();
    sendResponse({ success: true });
    return true;
  }
});

// Keep analysis tabs active by pinging them
setInterval(() => {
  activeAnalysisTabs.forEach(tabId => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        activeAnalysisTabs.delete(tabId);
        return;
      }

      chrome.tabs.sendMessage(tabId, { action: 'keepalive' }).catch(() => {
        activeAnalysisTabs.delete(tabId);
      });
    });
  });
}, 3000);

async function handleVideoAnalysis(videoUrl, inlinePrompt = null, providedTitle = null) {
  const geminiUrl = 'https://aistudio.google.com/prompts/new_chat';

  // Get current active tab to position the new tab right next to it
  const currentTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = currentTabs[0];

  const createOptions = { url: geminiUrl, active: true };
  if (currentTab) {
    createOptions.index = currentTab.index + 1;
  }

  // Fire tab creation with error handling
  let tabPromise;
  try {
    tabPromise = chrome.tabs.create(createOptions);
  } catch (error) {
    console.error('[VidMind] Failed to create tab:', error);
    throw new Error('Could not open AI Studio tab');
  }

  // Meanwhile, fetch storage
  const settingsPromise = chrome.storage.sync.get(['customPrompt', 'autoSwitchBack', 'promptLanguage']);

  const [tab, settings] = await Promise.all([tabPromise, settingsPromise]);
  const tabId = tab.id;

  const promptLanguage = settings.promptLanguage || 'en';
  const defaultLangPrompt = DEFAULT_PROMPTS[promptLanguage] || DEFAULT_PROMPTS['en'];
  const prompt = inlinePrompt || settings.customPrompt || defaultLangPrompt;
  const autoSwitchBack = settings.autoSwitchBack === true; // Default false to prevent network timeouts when tab is backgrounded

  // Extract video info
  const videoId = new URL(videoUrl).searchParams.get('v');
  const videoTitle = providedTitle || await getVideoTitle(videoUrl);

  const returnToTabId = currentTabs[0]?.id;

  // Store video URL, prompt, and return tab info for content script
  await chrome.storage.local.set({
    pendingAnalysis: {
      videoUrl: videoUrl,
      prompt: prompt,
      timestamp: Date.now(),
      returnToTabId: autoSwitchBack ? returnToTabId : null
    }
  });

  console.log('[VidMind] Started analysis and injected data for tab:', tabId);

  // Add to history
  await addToHistory({
    videoId,
    videoUrl,
    videoTitle,
    prompt,
    timestamp: Date.now(),
    tabId,
    status: 'running',
    autoSwitchBack
  });

  // Update usage stats
  await incrementUsageStats();
}

async function getVideoTitle(videoUrl) {
  try {
    const tabs = await chrome.tabs.query({ url: videoUrl });
    if (tabs.length > 0) {
      return tabs[0].title.replace(' - YouTube', '');
    }
  } catch (e) {
    console.error('Failed to get video title:', e);
  }
  return 'Unknown Video';
}

async function addToHistory(entry) {
  const data = await chrome.storage.local.get(['analysisHistory']);
  const history = data.analysisHistory || [];

  history.unshift(entry); // Add to beginning

  // Keep only last 100 entries
  if (history.length > 100) {
    history.splice(100);
  }

  await chrome.storage.local.set({ analysisHistory: history });
}

async function updateHistoryCompletion(tabId) {
  const data = await chrome.storage.local.get(['analysisHistory']);
  const history = data.analysisHistory || [];

  const entry = history.find(h => h.tabId === tabId);
  if (entry) {
    entry.status = 'completed';
    entry.completedAt = Date.now();
    await chrome.storage.local.set({ analysisHistory: history });
  }
}

async function getAnalysisHistory() {
  const data = await chrome.storage.local.get(['analysisHistory']);
  return data.analysisHistory || [];
}

async function incrementUsageStats() {
  const data = await chrome.storage.local.get(['usageStats']);
  const stats = data.usageStats || {
    totalAnalyses: 0,
    firstUse: Date.now(),
    lastUse: Date.now(),
    dailyUsage: {}
  };

  stats.totalAnalyses++;
  stats.lastUse = Date.now();

  // Track daily usage
  const today = new Date().toISOString().split('T')[0];
  stats.dailyUsage[today] = (stats.dailyUsage[today] || 0) + 1;

  await chrome.storage.local.set({ usageStats: stats });
}

async function getUsageStats() {
  const data = await chrome.storage.local.get(['usageStats']);
  return data.usageStats || {
    totalAnalyses: 0,
    firstUse: null,
    lastUse: null,
    dailyUsage: {}
  };
}

// Keyboard shortcut handler
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'analyze-current-video') {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.url && tab.url.includes('youtube.com/watch')) {
      await handleVideoAnalysis(tab.url, null, tab.title);
    }
  } else if (command === 'ask-custom-prompt') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.url && tab.url.includes('youtube.com/watch')) {
      // Inject CSS
      chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['prompt-modal.css']
      }).catch(err => console.error("Failed to inject CSS:", err));

      // Inject JS
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['prompt-modal.js']
      }).catch(err => console.error("Failed to inject JS:", err));
    }
  }
});

// --- Queue Monitor ---
// Polls AI Studio tabs to detect when generation completes, then sends queued messages.
let queueMonitorInterval = null;

function startQueueMonitor() {
  if (queueMonitorInterval) return;
  console.log('[VidMind] Queue monitor started');

  queueMonitorInterval = setInterval(async () => {
    const data = await chrome.storage.local.get(['messageQueue']);
    const queue = data.messageQueue || [];

    if (queue.length === 0) {
      clearInterval(queueMonitorInterval);
      queueMonitorInterval = null;
      console.log('[VidMind] Queue empty, monitor stopped');
      return;
    }

    // Find AI Studio tabs
    const tabs = await chrome.tabs.query({ url: 'https://aistudio.google.com/*' });
    if (tabs.length === 0) return;

    const tab = tabs[0];

    // Check if generation is in progress by injecting a check script
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const buttons = document.querySelectorAll('button, [role="button"]');
          for (const b of buttons) {
            const text = (b.textContent || '').trim().toLowerCase();
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            if ((text === 'stop' || aria === 'stop' || aria === 'stop generating') &&
                !b.disabled && b.offsetParent !== null) {
              return true; // still generating
            }
          }
          return false;
        }
      });

      const isGenerating = results?.[0]?.result;
      if (isGenerating) return; // still generating, wait

      // Generation complete — send next queued message
      const msg = queue.shift();
      await chrome.storage.local.set({ messageQueue: queue });
      console.log('[VidMind] Sending queued message:', msg?.slice(0, 50));

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (message) => {
          return new Promise((resolve) => {
            // Find textarea
            const textareas = Array.from(document.querySelectorAll('textarea'));
            const textarea = textareas.find(t => t.offsetParent !== null && t.getBoundingClientRect().height > 0);
            if (!textarea) { resolve(false); return; }

            textarea.focus();

            setTimeout(() => {
              // Insert message
              const inserted = document.execCommand('insertText', false, message);
              if (!inserted) {
                const setter = Object.getOwnPropertyDescriptor(
                  window.HTMLTextAreaElement.prototype, 'value'
                ).set;
                setter.call(textarea, message);
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
              }

              setTimeout(() => {
                // Find and click Run button
                const buttons = document.querySelectorAll('button, [role="button"]');
                for (const b of buttons) {
                  if (b.disabled || !b.offsetParent) continue;
                  const text = (b.textContent || '').trim().toLowerCase();
                  const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                  const icons = Array.from(b.querySelectorAll('.material-symbols-outlined, mat-icon'));
                  const hasIcon = icons.some(ic => {
                    const t = (ic.textContent || '').trim().toLowerCase();
                    return t === 'send' || t === 'play_arrow' || t === 'arrow_upward';
                  });

                  if (text === 'run' || text === 'submit' || text === 'send' ||
                      aria === 'run' || aria === 'submit' || hasIcon) {
                    b.click();
                    resolve(true);
                    return;
                  }
                }
                resolve(false);
              }, 200);
            }, 100);
          });
        },
        args: [msg]
      });

    } catch (err) {
      console.error('[VidMind] Queue monitor error:', err);
    }
  }, 2000); // Check every 2 seconds
}
