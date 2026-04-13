// Default prompts are now imported from prompts.js
// using window.DEFAULT_PROMPTS

document.addEventListener('DOMContentLoaded', () => {
  // Initialize i18n elements
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const message = chrome.i18n.getMessage(element.getAttribute('data-i18n'));
    if (message) element.innerHTML = message;
  });
});


const statusEl = document.getElementById('status');
const videoInfoEl = document.getElementById('videoInfo');
const analyzeBtn = document.getElementById('analyzeBtn');
const customPromptInput = document.getElementById('customPrompt');
const savePromptBtn = document.getElementById('savePrompt');
const resetPromptBtn = document.getElementById('resetPrompt');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const customizeShortcutBtn = document.getElementById('customizeShortcut');
const alertBox = document.getElementById('alertBox'); // New element
const langSelect = document.getElementById('promptLanguage'); // New element

// Add Cmd+Enter / Ctrl+Enter to save prompt
customPromptInput.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    savePromptBtn.click();
  }
});

function getDefaultPrompt() {
  const lang = langSelect.value || 'en';
  return window.DEFAULT_PROMPTS[lang] || window.DEFAULT_PROMPTS['en'];
}

function updatePlaceholder(lang) {
  const defaultText = window.DEFAULT_PROMPTS[lang] || window.DEFAULT_PROMPTS['en'];
  customPromptInput.placeholder = defaultText;
}

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
  if (tabName === 'queue') {
    loadQueue();
  } else if (tabName === 'history') {
    loadHistory();
  } else if (tabName === 'stats') {
    loadStats();
  } else if (tabName === 'settings') {
    loadShortcut();
  }
}

// Load saved prompt & language
chrome.storage.sync.get(['customPrompt', 'autoSwitchBack', 'enterBehavior', 'promptLanguage'], (result) => {
  if (result.customPrompt) {
    customPromptInput.value = result.customPrompt;
  }
  
  const currentLang = result.promptLanguage || 'en';
  langSelect.value = currentLang;
  updatePlaceholder(currentLang);

  // Update button text
  analyzeBtn.textContent = chrome.i18n.getMessage('btnAnalyze') || 'Analyze with Gemini';
});

langSelect.addEventListener('change', () => {
  chrome.storage.sync.set({ promptLanguage: langSelect.value });
  updatePlaceholder(langSelect.value);
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

// Save queue float setting
document.getElementById('showQueueFloat').addEventListener('change', (e) => {
  chrome.storage.sync.set({ showQueueFloat: e.target.checked });
});

// Save prompt handler
savePromptBtn.addEventListener('click', () => {
  const prompt = customPromptInput.value.trim();
  chrome.storage.sync.set({ customPrompt: prompt }, () => {
    showStatus(chrome.i18n.getMessage('statusPromptSaved'), 'success');
    setTimeout(() => showStatus(chrome.i18n.getMessage('statusReady'), 'info'), 2000);
  });
});

// Reset prompt handler
resetPromptBtn.addEventListener('click', () => {
  customPromptInput.value = '';
  chrome.storage.sync.set({ customPrompt: '' }, () => {
    showStatus(chrome.i18n.getMessage('statusUsingDefault', [langSelect.value.toUpperCase()]), 'success');
    setTimeout(() => showStatus(chrome.i18n.getMessage('statusReady'), 'info'), 2000);
  });
});

// Customize shortcut handler
customizeShortcutBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

// Clear history handler
clearHistoryBtn.addEventListener('click', () => {
  if (confirm(chrome.i18n.getMessage('confirmClearHistory') || 'Clear all analysis history?')) {
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
    document.getElementById('currentShortcut').textContent = chrome.i18n.getMessage('statusNotSet') || 'Not set';
  }

  const askCustomPromptCommand = commands.find(c => c.name === 'ask-custom-prompt');
  if (askCustomPromptCommand && askCustomPromptCommand.shortcut) {
    document.getElementById('customPromptShortcut').textContent = askCustomPromptCommand.shortcut;
  } else {
    document.getElementById('customPromptShortcut').textContent = chrome.i18n.getMessage('statusNotSet') || 'Not set';
  }

  // Load auto switch back setting
  chrome.storage.sync.get(['autoSwitchBack', 'enterBehavior', 'showQueueFloat'], (result) => {
    document.getElementById('autoSwitchBack').checked = result.autoSwitchBack !== false;
    document.getElementById('enterToSubmit').checked = result.enterBehavior !== 'newline';
    document.getElementById('showQueueFloat').checked = result.showQueueFloat !== false; // default on
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
      emptyDiv.textContent = chrome.i18n.getMessage('emptyHistory') || 'No analysis history yet';
      historyList.appendChild(emptyDiv);
      return;
    }

    historyList.textContent = '';
    response.history.forEach(item => {
      const date = new Date(item.timestamp);
      const timeStr = date.toLocaleString();
      const duration = item.completedAt
        ? Math.round((item.completedAt - item.timestamp) / 1000) + 's'
        : (chrome.i18n.getMessage('statusRunning') || 'Running...');

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
      statusEl.textContent = chrome.i18n.getMessage('statusReady') || 'Ready to analyze in background';
      statusEl.className = 'status info';
      analyzeBtn.disabled = false;
    }
  } else {
    statusEl.textContent = chrome.i18n.getMessage('statusNotYoutube') || 'Please open a YouTube video page';
    statusEl.className = 'status error';
    analyzeBtn.disabled = true;
  }
});

analyzeBtn.addEventListener('click', async () => {
  analyzeBtn.disabled = true;
  showStatus(chrome.i18n.getMessage('statusStarting') || 'Starting background analysis...', 'info');

  // Auto-save the current prompt before analyzing
  const currentPrompt = customPromptInput.value.trim() || getDefaultPrompt();
  chrome.storage.sync.set({ customPrompt: customPromptInput.value.trim() });

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const videoUrl = tab.url;

    chrome.runtime.sendMessage({
      action: 'analyzeVideo',
      videoUrl: videoUrl,
      prompt: currentPrompt
    }, (response) => {
      if (response && response.success) {
        showStatus(chrome.i18n.getMessage('statusSuccess') || 'Analysis started. Check Google AI Studio.', 'success');
        setTimeout(() => window.close(), 800);
      } else {
        const errorMsg = response?.error || chrome.runtime.lastError?.message || 'Unknown error';
        const friendly = errorMsg.includes('tab') ? 'Could not open AI Studio. Try again.'
          : errorMsg.includes('storage') ? 'Storage error. Please retry.'
          : 'Analysis failed. Please try again.';
        showStatus(friendly, 'error');
        analyzeBtn.disabled = false;
      }
    });
  } catch (error) {
    showStatus('Analysis failed. Please try again.', 'error');
    analyzeBtn.disabled = false;
  }
});

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

// --- Queue Tab ---
const queueInput = document.getElementById('queueInput');
const queueAddBtn = document.getElementById('queueAddBtn');
const queueList = document.getElementById('queueList');
const queueEmpty = document.getElementById('queueEmpty');
const queueStatus = document.getElementById('queueStatus');

queueAddBtn.addEventListener('click', () => {
  const msg = queueInput.value.trim();
  if (!msg) return;

  chrome.storage.local.get(['messageQueue'], (data) => {
    const queue = data.messageQueue || [];
    queue.push(msg);
    chrome.storage.local.set({ messageQueue: queue }, () => {
      queueInput.value = '';
      loadQueue();
      // Ensure monitor is running
      chrome.runtime.sendMessage({ action: 'startQueueMonitor' });
    });
  });
});

// Cmd/Ctrl+Enter to add
queueInput.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    queueAddBtn.click();
  }
});

function loadQueue() {
  chrome.storage.local.get(['messageQueue'], (data) => {
    const queue = data.messageQueue || [];
    queueList.textContent = '';

    if (queue.length === 0) {
      queueEmpty.style.display = 'block';
      queueStatus.textContent = '';
      return;
    }

    queueEmpty.style.display = 'none';
    queueStatus.textContent = `${queue.length} message${queue.length > 1 ? 's' : ''} queued \u2014 will auto-send after generation completes`;

    queue.forEach((msg, i) => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid #dadce0;font-size:12px;';

      const num = document.createElement('span');
      num.style.cssText = 'color:#5f6368;min-width:16px;';
      num.textContent = `${i + 1}.`;

      const text = document.createElement('span');
      text.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      text.textContent = msg;
      text.title = msg;

      const del = document.createElement('button');
      del.textContent = '\u2715';
      del.style.cssText = 'background:none;border:none;color:#ea4335;cursor:pointer;font-size:14px;padding:2px 4px;';
      del.addEventListener('click', () => {
        chrome.storage.local.get(['messageQueue'], (d) => {
          const q = d.messageQueue || [];
          q.splice(i, 1);
          chrome.storage.local.set({ messageQueue: q }, loadQueue);
        });
      });

      item.appendChild(num);
      item.appendChild(text);
      item.appendChild(del);
      queueList.appendChild(item);
    });
  });
}
