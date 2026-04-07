// prompts.js
// Centralized, multilingual default prompts for video analysis

const DEFAULT_PROMPTS = {
  en: `Extract important info and arguments, speaker, action to do, include as much detail as possible. Output them all.
//Use original language as the context below.

////Combine tone, intonation, and emotional analysis. (integrate inside, don't write separately)
//For key terminology, you can use the original language.
// Summarize the entire text, don't break down by timeline.

//Extract the useful AI prompt if mentioned.`,

  zh: `提取重要信息、论点、发言人、待办事项，包含尽可能多的细节。输出全部摘要内容。
//对于保留术语，请使用视频的原始语言。

////结合语气、语调和情绪分析。（直接融入正文中，不要单独列表）
//对于特定的关键技术概念或术语，可以保留源语言。
//全面总结整个视频内容，不要按照时间轴去拆分。

//如果视频中提到了有用的AI提示词，请务必单独提取出来。`,

  ja: `重要な情報、議論、発言者、実行すべきアクションを抽出し、可能な限り詳細に含めてください。すべて出力してください。
//特定の重要な用語については、元の言語をご使用ください。

////トーン、イントネーション、感情分析を組み合わせます。（別々に書かず、内部に統合してください）
//タイムラインで分割せず、テキスト全体を要約してください。

//有用なAIプロンプトが言及されている場合は、それを独自に抽出してください。`
};

// Use global object if loaded in window (popup), or self if service worker (background)
if (typeof self !== 'undefined') {
  self.DEFAULT_PROMPTS = DEFAULT_PROMPTS;
}
if (typeof window !== 'undefined') {
  window.DEFAULT_PROMPTS = DEFAULT_PROMPTS;
}
