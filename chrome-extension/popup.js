const DEFAULT_PROMPT = `Extract important info and arguments, speaker, action to do, include as much detail as possible. Output them all.
//Use original language as the context below.

////Combine tone, intonation, and emotional analysis. (integrate inside, don't write separately)
//For key terminology, you can use the original language.
// Summarize the entire text, don't break down by timeline.

//Extract the useful AI prompt if mentioned.`;

const statusEl = document.getElementById('status');
const videoInfoEl = document.getElementById('videoInfo');
const analyzeBtn = document.getElementById('analyzeBtn');
const customPromptTextarea = document.getElementById('customPrompt');
const savePromptBtn = document.getElementById('savePrompt');
const resetPromptBtn = document.getElementById('resetPrompt');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const customizeShortcutBtn = document.getElementById('customizeShortcut');

// Add Cmd+Enter / Ctrl+Enter to save prompt
customPromptTextarea.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    savePromptBtn.click();
  }
});

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    switchTab(tabName);
  });
});

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`${tabName}-tab`).classList.add('active');

  // Load data for specific tabs
  if (tabName === 'history') {
    loadHistory();
  } else if (tabName === 'stats') {
    loadStats();
  } else if (tabName === 'settings') {
    loadShortcut();
  }
}

// Load saved prompt
chrome.storage.sync.get(['customPrompt', 'autoSwitchBack', 'enterBehavior'], (result) => {
  customPromptTextarea.value = result.customPrompt || DEFAULT_PROMPT;

  // Update button text - always shows normal text now since we open in foreground
  analyzeBtn.textContent = 'Analyze with Gemini';
});

// Save auto switch back setting
document.getElementById('autoSwitchBack').addEventListener('change', (e) => {
  chrome.storage.sync.set({ autoSwitchBack: e.target.checked });
});

// Save enter behavior setting
document.getElementById('enterToSubmit').addEventListener('change', (e) => {
  const enterBehavior = e.target.checked ? 'submit' : 'newline';
  chrome.storage.sync.set({ enterBehavior: enterBehavior });
});

// Save prompt handler
savePromptBtn.addEventListener('click', () => {
  const prompt = customPromptTextarea.value.trim();
  chrome.storage.sync.set({ customPrompt: prompt }, () => {
    showStatus('Prompt saved!', 'success');
    setTimeout(() => showStatus('Ready to analyze', 'info'), 2000);
  });
});

// Reset prompt handler
resetPromptBtn.addEventListener('click', () => {
  customPromptTextarea.value = DEFAULT_PROMPT;
  chrome.storage.sync.set({ customPrompt: DEFAULT_PROMPT }, () => {
    showStatus('Prompt reset to default', 'success');
    setTimeout(() => showStatus('Ready to analyze', 'info'), 2000);
  });
});

// Customize shortcut handler
customizeShortcutBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

// Clear history handler
clearHistoryBtn.addEventListener('click', () => {
  if (confirm('Clear all analysis history?')) {
    chrome.runtime.sendMessage({ action: 'clearHistory' }, () => {
      loadHistory();
    });
  }
});

// Load current shortcut
async function loadShortcut() {
  const commands = await chrome.commands.getAll();
  const analyzeCommand = commands.find(c => c.name === 'analyze-current-video');
  if (analyzeCommand && analyzeCommand.shortcut) {
    document.getElementById('currentShortcut').textContent = analyzeCommand.shortcut;
  } else {
    document.getElementById('currentShortcut').textContent = 'Not set';
  }

  // Load auto switch back setting
  chrome.storage.sync.get(['autoSwitchBack', 'enterBehavior'], (result) => {
    document.getElementById('autoSwitchBack').checked = result.autoSwitchBack !== false;
    document.getElementById('enterToSubmit').checked = result.enterBehavior === 'submit';
  });
}

// Load history
function loadHistory() {
  chrome.runtime.sendMessage({ action: 'getHistory' }, (response) => {
    const historyList = document.getElementById('historyList');

    if (!response.success || !response.history || response.history.length === 0) {
      historyList.textContent = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.textContent = 'No analysis history yet';
      historyList.appendChild(emptyDiv);
      return;
    }

    historyList.textContent = '';
    response.history.forEach(item => {
      const date = new Date(item.timestamp);
      const timeStr = date.toLocaleString();
      const duration = item.completedAt
        ? Math.round((item.completedAt - item.timestamp) / 1000) + 's'
        : 'Running...';

      const itemDiv = document.createElement('div');
      itemDiv.className = 'history-item';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'history-title';
      titleDiv.textContent = item.videoTitle;

      const metaDiv = document.createElement('div');
      metaDiv.className = 'history-meta';
      metaDiv.textContent = timeStr + ' ';

      const statusSpan = document.createElement('span');
      statusSpan.className = `history-status ${item.status}`;
      statusSpan.textContent = item.status;
      metaDiv.appendChild(statusSpan);

      if (item.completedAt) {
        const durationSpan = document.createElement('span');
        durationSpan.style.marginLeft = '8px';
        durationSpan.textContent = duration;
        metaDiv.appendChild(durationSpan);
      }

      itemDiv.appendChild(titleDiv);
      itemDiv.appendChild(metaDiv);
      historyList.appendChild(itemDiv);
    });
  });
}

// Load stats
function loadStats() {
  chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
    if (!response.success) return;

    const stats = response.stats;
    document.getElementById('totalAnalyses').textContent = stats.totalAnalyses || 0;

    // Today's count
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('todayAnalyses').textContent = stats.dailyUsage?.[today] || 0;

    // First use
    if (stats.firstUse) {
      const firstUseDate = new Date(stats.firstUse);
      document.getElementById('firstUse').textContent = firstUseDate.toLocaleDateString();
    } else {
      document.getElementById('firstUse').textContent = '-';
    }
  });
}

// Get current tab info
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTab = tabs[0];
  const url = currentTab.url;

  if (url && url.includes('youtube.com/watch')) {
    const videoId = new URL(url).searchParams.get('v');
    if (videoId) {
      videoInfoEl.textContent = `Video: ${currentTab.title}`;
      videoInfoEl.style.display = 'block';
      statusEl.textContent = 'Ready to analyze in background';
      statusEl.className = 'status info';
    }
  } else {
    statusEl.textContent = 'Please open a YouTube video page';
    statusEl.className = 'status error';
    analyzeBtn.disabled = true;
  }
});

analyzeBtn.addEventListener('click', async () => {
  analyzeBtn.disabled = true;
  showStatus('Starting background analysis...', 'info');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const videoUrl = tab.url;

    chrome.runtime.sendMessage({
      action: 'analyzeVideo',
      videoUrl: videoUrl
    }, (response) => {
      if (response.success) {
        showStatus('Analysis running in background. You\'ll be notified when complete.', 'success');
        setTimeout(() => window.close(), 2000);
      } else {
        showStatus('Error: ' + response.error, 'error');
        analyzeBtn.disabled = false;
      }
    });
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
    analyzeBtn.disabled = false;
  }
});

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}
