const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "cws-assets");
fs.mkdirSync(outDir, { recursive: true });

const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function renderAsset({ html, width, height, outputPath }) {
  const tmpHtml = path.join(os.tmpdir(), `cws-render-vidmind-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(tmpHtml, html, "utf8");
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "cws-render-vidmind-profile-"));

  try {
    execFileSync(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--disable-sync",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-component-update",
        "--mute-audio",
        `--user-data-dir=${profileDir}`,
        `--window-size=${width},${height}`,
        `--screenshot=${outputPath}`,
        `file://${tmpHtml}`
      ],
      { stdio: "ignore", timeout: 20000 }
    );
  } finally {
    fs.rmSync(profileDir, { recursive: true, force: true });
    try { fs.unlinkSync(tmpHtml); } catch {}
  }
}

// 1. Icon 128 (128x128, no alpha)
const icon128Html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 128px;
      height: 128px;
      background: #090d16;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .badge {
      width: 112px;
      height: 112px;
      background: linear-gradient(135deg, #ef4444 0%, #8b5cf6 50%, #3b82f6 100%);
      border-radius: 26px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
      border: 2px solid rgba(255, 255, 255, 0.25);
      position: relative;
    }
    .play {
      width: 0;
      height: 0;
      border-top: 18px solid transparent;
      border-bottom: 18px solid transparent;
      border-left: 30px solid #ffffff;
      margin-left: 6px;
      margin-bottom: 2px;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    }
    .sparkle {
      position: absolute;
      top: 12px;
      right: 14px;
      font-size: 20px;
    }
    .label {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="badge">
    <div class="sparkle">✨</div>
    <div class="play"></div>
    <div class="label">VidMind</div>
  </div>
</body>
</html>`;

// 2. Screenshot 1: One-Click Analysis on YouTube (1280x800)
const screenshot1Html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1280px;
      height: 800px;
      background: #0b0f19;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .header {
      background: #111827;
      padding: 18px 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1f2937;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-sq {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #ef4444 0%, #8b5cf6 50%, #3b82f6 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 20px;
      color: white;
    }
    .title-group h1 {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
    }
    .title-group p {
      font-size: 13px;
      color: #94a3b8;
    }
    .pill {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      padding: 8px 18px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .main {
      flex: 1;
      display: grid;
      grid-template-columns: 780px 1fr;
      padding: 30px;
      gap: 28px;
    }
    .yt-container {
      background: #111827;
      border-radius: 16px;
      border: 1px solid #1f2937;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .video-viewport {
      height: 430px;
      background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .play-btn-huge {
      width: 80px;
      height: 56px;
      background: #ff0000;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(255, 0, 0, 0.4);
    }
    .play-tri {
      width: 0;
      height: 0;
      border-top: 12px solid transparent;
      border-bottom: 12px solid transparent;
      border-left: 20px solid white;
      margin-left: 4px;
    }
    .vidmind-floating-badge {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(8px);
      border: 1px solid #3b82f6;
      padding: 10px 18px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .action-btn {
      background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
      color: white;
      font-size: 13px;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
    }
    .shortcut-tag {
      background: #1e293b;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid #334155;
    }
    .yt-meta {
      padding: 20px;
    }
    .yt-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #ffffff;
    }
    .yt-channel {
      font-size: 14px;
      color: #94a3b8;
    }
    .sidebar-card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .feature-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px;
      background: #1e293b;
      border-radius: 12px;
      border-left: 4px solid #3b82f6;
    }
    .feature-row.red { border-left-color: #ef4444; }
    .feature-row.purple { border-left-color: #8b5cf6; }
    .f-title { font-weight: 700; font-size: 15px; margin-bottom: 4px; color: #f8fafc; }
    .f-desc { font-size: 12px; color: #94a3b8; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="logo-sq">✨</div>
      <div class="title-group">
        <h1>VidMind: AI Video Analyzer for YouTube</h1>
        <p>Seamless connection between YouTube and Google Gemini</p>
      </div>
    </div>
    <div class="pill">
      <span>●</span> Direct YouTube Video Analysis
    </div>
  </div>
  <div class="main">
    <div class="yt-container">
      <div class="video-viewport">
        <div class="vidmind-floating-badge">
          <span style="font-weight: 700; font-size: 14px; color: #60a5fa;">VidMind Action</span>
          <div class="action-btn">Analyze with Gemini</div>
          <div class="shortcut-tag">⌘+Shift+A</div>
        </div>
        <div class="play-btn-huge"><div class="play-tri"></div></div>
      </div>
      <div class="yt-meta">
        <div class="yt-title">Stanford CS229: Machine Learning Full Course & Multimodal Architectures</div>
        <div class="yt-channel">Stanford University • 1.2M views • 1h 48m</div>
      </div>
    </div>
    <div class="sidebar-card">
      <h3 style="font-size: 16px; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">Core Capabilities</h3>
      <div class="feature-row red">
        <div>
          <div class="f-title">One-Click Dispatch</div>
          <div class="f-desc">Extracts video context and feeds directly into Gemini in Google AI Studio without manual copy-pasting.</div>
        </div>
      </div>
      <div class="feature-row purple">
        <div>
          <div class="f-title">Deep Transcript Understanding</div>
          <div class="f-desc">Captures long-context video captions, key timestamps, and full speaker dialogues automatically.</div>
        </div>
      </div>
      <div class="feature-row">
        <div>
          <div class="f-title">Instant Keyboard Shortcuts</div>
          <div class="f-desc">Press Cmd+Shift+A anywhere on YouTube to trigger instant analysis. Customize in settings anytime.</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

// 3. Screenshot 2: Google AI Studio Gemini Deep Dive (1280x800)
const screenshot2Html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1280px;
      height: 800px;
      background: #090d16;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .header {
      background: #111827;
      padding: 18px 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1f2937;
    }
    .badge-bar {
      display: flex;
      gap: 12px;
    }
    .tag {
      background: #1e293b;
      border: 1px solid #334155;
      color: #cbd5e1;
      padding: 6px 14px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
    }
    .tag.active {
      background: #1d4ed8;
      border-color: #3b82f6;
      color: #ffffff;
    }
    .main {
      flex: 1;
      padding: 30px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
    }
    .box {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
    }
    .box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #1f2937;
    }
    .box-title {
      font-size: 16px;
      font-weight: 700;
      color: #60a5fa;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .prompt-content {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 16px;
      font-family: monospace;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.6;
      flex: 1;
    }
    .ai-output {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 18px;
      font-size: 13px;
      color: #e2e8f0;
      line-height: 1.6;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .output-item {
      background: #1e293b;
      padding: 12px 14px;
      border-radius: 8px;
      border-left: 3px solid #10b981;
    }
    .output-item h4 {
      font-size: 14px;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .output-item p {
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size: 18px; font-weight: 700; color: #ffffff;">Google AI Studio & Gemini Integration</div>
    <div class="badge-bar">
      <div class="tag active">Gemini 1.5 Pro / 2.0</div>
      <div class="tag">Auto-Tab Focus</div>
      <div class="tag">Zero Copy-Paste</div>
    </div>
  </div>
  <div class="main">
    <div class="box">
      <div class="box-header">
        <div class="box-title">📥 Injected Video Context</div>
        <span style="font-size: 12px; color: #94a3b8;">Automated by VidMind</span>
      </div>
      <div class="prompt-content">
[SYSTEM: YOUTUBE VIDEO CONTEXT]<br>
TITLE: Stanford CS229: Machine Learning<br>
URL: https://youtube.com/watch?v=...<br>
DURATION: 1h 48m<br><br>
[TASK PROMPT]<br>
Please analyze this video lecture in depth:<br>
1. Synthesize core mathematical formulas & proofs<br>
2. Highlight practical real-world engineering pitfalls<br>
3. Provide chapter-by-chapter actionable takeaways<br>
4. Language output: en (English)
      </div>
    </div>
    <div class="box">
      <div class="box-header">
        <div class="box-title">🤖 Multimodal Gemini Synthesis</div>
        <span style="font-size: 12px; color: #10b981;">⚡ High Accuracy</span>
      </div>
      <div class="ai-output">
        <div class="output-item">
          <h4>1. Executive Summary</h4>
          <p>Comprehensive overview of gradient descent optimization, loss landscape convexity, and regularization tradeoffs.</p>
        </div>
        <div class="output-item">
          <h4>2. Key Architectural Takeaways</h4>
          <p>Focuses on learning rate decay schedules, momentum coefficients, and numerical stability in backpropagation.</p>
        </div>
        <div class="output-item">
          <h4>3. Actionable Checklist</h4>
          <p>Practical verification steps for gradient checking, batch normalization placement, and hyperparameter tuning.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

// 4. Screenshot 3: Custom Prompts & Settings Popup (1280x800)
const screenshot3Html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1280px;
      height: 800px;
      background: #090d16;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .popup-card {
      width: 460px;
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .popup-top {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1f2937;
    }
    .popup-top h2 { font-size: 17px; font-weight: 700; color: #ffffff; }
    .tabs {
      display: flex;
      background: #0f172a;
      border-bottom: 1px solid #1f2937;
    }
    .tab {
      flex: 1;
      padding: 12px;
      text-align: center;
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
      cursor: pointer;
    }
    .tab.active {
      color: #60a5fa;
      border-bottom: 2px solid #3b82f6;
      background: #111827;
    }
    .popup-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .field label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 6px;
    }
    .field textarea, .field select {
      width: 100%;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 10px 12px;
      color: #ffffff;
      font-size: 13px;
    }
    .field textarea { height: 90px; resize: none; font-family: monospace; }
    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .toggle-row span { font-size: 13px; color: #cbd5e1; }
    .switch {
      width: 42px;
      height: 24px;
      background: #3b82f6;
      border-radius: 12px;
      position: relative;
    }
    .switch-circle {
      width: 18px;
      height: 18px;
      background: white;
      border-radius: 50%;
      position: absolute;
      top: 3px;
      right: 3px;
    }
    .btn-save {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      font-weight: 700;
      font-size: 14px;
      padding: 12px;
      border-radius: 10px;
      border: none;
      margin-top: 8px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="popup-card">
    <div class="popup-top">
      <h2>VidMind Settings</h2>
      <span style="font-size: 12px; color: #10b981; font-weight: 700;">v1.3.2</span>
    </div>
    <div class="tabs">
      <div class="tab">Analyze</div>
      <div class="tab active">Settings</div>
      <div class="tab">History</div>
    </div>
    <div class="popup-body">
      <div class="field">
        <label>Custom Analysis Prompt Template</label>
        <textarea>Summarize this YouTube video into 5 executive bullet points with timestamps, followed by immediate action items.</textarea>
      </div>
      <div class="field">
        <label>Default Output Language</label>
        <select>
          <option selected>English (Default)</option>
          <option>Chinese (Simplified)</option>
          <option>Japanese</option>
        </select>
      </div>
      <div class="toggle-row">
        <span>Auto-switch to Gemini tab</span>
        <div class="switch"><div class="switch-circle"></div></div>
      </div>
      <button class="btn-save">Save Configuration</button>
    </div>
  </div>
</body>
</html>`;

// 5. Small Promo Tile (440x280)
const promoSmallHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 440px;
      height: 280px;
      background: linear-gradient(135deg, #090d16 0%, #1e1b4b 100%);
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px;
      position: relative;
    }
    .badge {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #ef4444 0%, #8b5cf6 50%, #3b82f6 100%);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      margin-bottom: 14px;
      box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 6px;
      letter-spacing: -0.5px;
    }
    p {
      font-size: 13px;
      color: #94a3b8;
      max-width: 340px;
      line-height: 1.4;
      margin-bottom: 12px;
    }
    .pill {
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid #3b82f6;
      color: #93c5fd;
      padding: 4px 14px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="badge">✨</div>
  <h1>VidMind</h1>
  <p>One-Click YouTube Video Analysis powered by Google Gemini</p>
  <div class="pill">Fast • Multimodal • Free</div>
</body>
</html>`;

// 6. Marquee Promo Tile (1400x560)
const promoMarqueeHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1400px;
      height: 560px;
      background: linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #0f172a 100%);
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
      padding: 60px 80px;
      gap: 40px;
    }
    .badge {
      width: 68px;
      height: 68px;
      background: linear-gradient(135deg, #ef4444 0%, #8b5cf6 50%, #3b82f6 100%);
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin-bottom: 20px;
      box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4);
    }
    h1 {
      font-size: 38px;
      font-weight: 900;
      line-height: 1.2;
      margin-bottom: 16px;
      letter-spacing: -1px;
    }
    p {
      font-size: 16px;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .tags {
      display: flex;
      gap: 12px;
    }
    .tag {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 8px 16px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      color: #cbd5e1;
    }
    .visual-box {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .v-row {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #1e293b;
      padding: 14px 18px;
      border-radius: 12px;
      border-left: 4px solid #ef4444;
    }
    .v-row:nth-child(2) { border-left-color: #8b5cf6; }
    .v-row:nth-child(3) { border-left-color: #3b82f6; }
    .v-title { font-size: 15px; font-weight: 700; color: #f8fafc; }
    .v-sub { font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div>
    <div class="badge">✨</div>
    <h1>VidMind — Turn YouTube Videos into Actionable Insights</h1>
    <p>Analyze any YouTube video with Google Gemini in one click. Extract executive summaries, timestamps, study notes, and transcripts instantly.</p>
    <div class="tags">
      <div class="tag">⚡ 1-Click Gemini Analysis</div>
      <div class="tag">🎯 Custom Prompts</div>
      <div class="tag">🌐 Multilingual</div>
    </div>
  </div>
  <div class="visual-box">
    <div class="v-row">
      <span style="font-size: 20px;">🎬</span>
      <div>
        <div class="v-title">YouTube Video Ingestion</div>
        <div class="v-sub">Automatically extracts video URL, metadata, and timestamps</div>
      </div>
    </div>
    <div class="v-row">
      <span style="font-size: 20px;">⚡</span>
      <div>
        <div class="v-title">Instant Google AI Studio Dispatch</div>
        <div class="v-sub">Seamless multimodal prompt submission with zero copy-pasting</div>
      </div>
    </div>
    <div class="v-row">
      <span style="font-size: 20px;">📝</span>
      <div>
        <div class="v-title">Structured Actionable Takeaways</div>
        <div class="v-sub">Summaries, code blocks, math derivations, and key points</div>
      </div>
    </div>
  </div>
</body>
</html>`;

console.log("Rendering CWS assets for VidMind...");

renderAsset({ html: icon128Html, width: 128, height: 128, outputPath: path.join(outDir, "icon-128.png") });
console.log("  Rendered icon-128.png (128x128)");

renderAsset({ html: screenshot1Html, width: 1280, height: 800, outputPath: path.join(outDir, "screenshot-1-youtube-analysis.png") });
console.log("  Rendered screenshot-1-youtube-analysis.png (1280x800)");

renderAsset({ html: screenshot2Html, width: 1280, height: 800, outputPath: path.join(outDir, "screenshot-2-gemini-studio.png") });
console.log("  Rendered screenshot-2-gemini-studio.png (1280x800)");

renderAsset({ html: screenshot3Html, width: 1280, height: 800, outputPath: path.join(outDir, "screenshot-3-custom-settings.png") });
console.log("  Rendered screenshot-3-custom-settings.png (1280x800)");

renderAsset({ html: promoSmallHtml, width: 440, height: 280, outputPath: path.join(outDir, "promo-small-440x280.png") });
console.log("  Rendered promo-small-440x280.png (440x280)");

renderAsset({ html: promoMarqueeHtml, width: 1400, height: 560, outputPath: path.join(outDir, "promo-marquee-1400x560.png") });
console.log("  Rendered promo-marquee-1400x560.png (1400x560)");

console.log("All VidMind CWS assets generated successfully in", outDir);
