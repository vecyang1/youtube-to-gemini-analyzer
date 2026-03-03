// Default analysis prompt template
const DEFAULT_ANALYSIS_PROMPT = `各自提取 important info and aruguments, speaker,action to do, include as much as detail. Output them all.
//use original langauge as the context below.

////Combine tone, intonation, and emotional analysis. (integrate inside, don't write seperately)
//针对关键术语 可用原语言的.
// 综述全文,不要break down by timeline.

//Extract the useful AI prompt if mentioned.`;

// Track active analysis tabs to keep them alive
let activeAnalysisTabs = new Set();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeVideo') {
    handleVideoAnalysis(request.videoUrl)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'analysisStarted') {
    if (sender.tab?.id) {
      activeAnalysisTabs.add(sender.tab.id);
      console.log('[YT2Gemini] Tracking analysis tab:', sender.tab.id);
    }
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'analysisComplete') {
    if (sender.tab?.id) {
      activeAnalysisTabs.delete(sender.tab.id);
      console.log('[YT2Gemini] Analysis complete for tab:', sender.tab.id);

      // Update completion in history
      updateHistoryCompletion(sender.tab.id);

      // Notify user that analysis is complete
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'YT2Gemini Analysis Complete',
        message: 'Video analysis finished. Check Google AI Studio tab.',
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
        console.error('[YT2Gemini] Failed to switch tab:', err);
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

async function handleVideoAnalysis(videoUrl) {
  // Get custom prompt from storage or use default
  const settings = await chrome.storage.sync.get(['customPrompt', 'autoSwitchBack']);
  const prompt = settings.customPrompt || DEFAULT_ANALYSIS_PROMPT;
  const autoSwitchBack = settings.autoSwitchBack !== false; // Default true

  // Extract video info
  const videoId = new URL(videoUrl).searchParams.get('v');
  const videoTitle = await getVideoTitle(videoUrl);

  // Get current active tab to return to later
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const returnToTabId = currentTab?.id;

  // Store video URL, prompt, and return tab info for content script
  await chrome.storage.local.set({
    pendingAnalysis: {
      videoUrl: videoUrl,
      prompt: prompt,
      timestamp: Date.now(),
      returnToTabId: autoSwitchBack ? returnToTabId : null
    }
  });

  console.log('[YT2Gemini] Starting analysis:', { videoUrl, autoSwitchBack, returnToTabId });

  // Always create a new tab in FOREGROUND to ensure video loads
  const geminiUrl = 'https://aistudio.google.com/prompts/new_chat';
  const tab = await chrome.tabs.create({
    url: geminiUrl,
    active: true
  });
  const tabId = tab.id;
  console.log('[YT2Gemini] Created new tab:', tabId);

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
      await handleVideoAnalysis(tab.url);
    }
  }
});
