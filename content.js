(function () {
  "use strict";

  var STORAGE_KEY = "webmeld_rules_v1";
  var AGENT_CONFIG_KEY = "webmeld_agent_config_v1";
  var PAGE_KEY = location.origin + location.pathname;
  var languageOverride = new URLSearchParams(location.search).get("webmeldLang");
  var pageLanguage = languageOverride || document.documentElement.lang || navigator.language || "en";
  var IS_ZH = /^zh\b/i.test(pageLanguage);

  function uiText(english, chinese) {
    return IS_ZH ? chinese : english;
  }

  var state = {
    open: false,
    inspecting: false,
    selected: null,
    selectedMetrics: null,
    highlighted: null,
    pending: null,
    rules: [],
    agentConfig: { url: "", model: "", key: "" }
  };

  var host = document.createElement("div");
  host.id = "webmeld-root";
  host.style.display = "none";
  document.documentElement.appendChild(host);

  var highlight = document.createElement("div");
  highlight.id = "webmeld-highlight";
  document.documentElement.appendChild(highlight);

  var shadow = host.attachShadow({ mode: "open" });
  var uiStyle = document.createElement("style");
  uiStyle.textContent = [
    ":host { all: initial; }",
    ".wm-shell { position: fixed; top: 18px; right: 18px; z-index: 2147483647; width: 336px; max-height: calc(100vh - 36px); overflow: hidden; border: 1px solid #e6e9f2; border-radius: 18px; color: #202838; background: #ffffff; box-shadow: 0 20px 60px rgba(31, 40, 63, .22), 0 2px 8px rgba(31, 40, 63, .08); font: 13px/1.45 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }",
    ".wm-header { display: flex; align-items: center; justify-content: space-between; padding: 15px 16px 13px; border-bottom: 1px solid #edf0f5; }",
    ".wm-brand { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 800; letter-spacing: -.02em; }",
    ".wm-orb { width: 25px; height: 25px; display: block; filter: drop-shadow(0 4px 7px rgba(105, 78, 231, .24)); }",
    ".wm-orb svg { display: block; width: 100%; height: 100%; }",
    ".wm-badge { padding: 3px 6px; border: 1px solid #ded9ff; border-radius: 5px; color: #7657f6; background: #faf9ff; font-size: 9px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }",
    ".wm-close { width: 25px; height: 25px; border: 0; border-radius: 7px; color: #8a95a6; background: transparent; font-size: 17px; line-height: 1; }",
    ".wm-close:hover { color: #7657f6; background: #f3f1ff; }",
    ".wm-header-actions { display: flex; align-items: center; gap: 5px; }",
    ".wm-settings { width: 25px; height: 25px; border: 0; border-radius: 7px; color: #8a95a6; background: transparent; font-size: 14px; }",
    ".wm-settings:hover { color: #7657f6; background: #f3f1ff; }",
    ".wm-body { max-height: calc(100vh - 135px); overflow: auto; padding: 14px 15px 15px; }",
    ".wm-select { width: 100%; display: flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 10px; border: 1px solid #dcd7ff; border-radius: 9px; color: #6147dd; background: #faf9ff; font-size: 11px; font-weight: 750; transition: 140ms ease; }",
    ".wm-select:hover, .wm-select.active { border-color: #7657f6; color: #fff; background: #7657f6; }",
    ".wm-selected { margin-top: 12px; padding: 10px; border: 1px solid #eceef5; border-radius: 9px; background: #fafbfe; }",
    ".wm-selected-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }",
    ".wm-selected small { display: block; color: #9ca7b8; font-size: 9px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; }",
    ".wm-target-status { padding: 3px 6px; border-radius: 999px; color: #a1aaba; background: #f0f2f7; font-size: 8px; font-weight: 800; }",
    ".wm-target-status.ready { color: #2a8f61; background: #eaf8f0; }",
    ".wm-selected strong { display: block; overflow: hidden; color: #556276; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }",
    ".wm-selected code { display: block; overflow: hidden; margin-top: 4px; color: #9aa4b6; font: 9px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; text-overflow: ellipsis; white-space: nowrap; }",
    ".wm-target-meta { display: flex; gap: 6px; margin-top: 7px; color: #758197; font: 9px ui-monospace, SFMono-Regular, Menlo, monospace; }",
    ".wm-target-meta span { padding: 3px 5px; border-radius: 5px; background: #eef0f6; }",
    ".wm-selected-html { max-height: 48px; overflow: auto; margin: 7px 0 0; padding: 6px; border: 1px solid #e8ebf2; border-radius: 6px; color: #8a95a7; background: #fff; font: 8px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; word-break: break-all; }",
    ".wm-label { display: flex; align-items: center; justify-content: space-between; margin: 15px 0 7px; color: #5c697d; font-size: 10px; font-weight: 800; }",
    ".wm-label span { color: #a5afbd; font-weight: 500; }",
    ".wm-prompt { width: 100%; min-height: 87px; resize: vertical; padding: 10px; border: 1px solid #e3e7ef; border-radius: 9px; outline: none; color: #374356; background: #fff; font: 11px/1.55 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }",
    ".wm-prompt:focus { border-color: #bdb2ff; box-shadow: 0 0 0 3px #f2f0ff; }",
    ".wm-prompt::placeholder { color: #b2bac6; }",
    ".wm-chips { display: flex; flex-wrap: wrap; gap: 5px; margin: 8px 0 12px; }",
    ".wm-chip { padding: 5px 7px; border: 1px solid #e8eaf2; border-radius: 6px; color: #7d899b; background: #fafbfe; font-size: 9px; }",
    ".wm-chip:hover { border-color: #d1caff; color: #6852db; background: #faf9ff; }",
    ".wm-generate { width: 100%; padding: 10px 11px; border: 0; border-radius: 8px; color: #fff; background: linear-gradient(135deg, #8067f8, #6047e4); box-shadow: 0 7px 16px rgba(104, 76, 230, .2); font-size: 11px; font-weight: 800; transition: 140ms ease; }",
    ".wm-generate:hover { transform: translateY(-1px); box-shadow: 0 9px 20px rgba(104, 76, 230, .27); }",
    ".wm-generate:disabled { cursor: wait; opacity: .68; transform: none; }",
    ".wm-agent-line { display: flex; align-items: center; justify-content: space-between; gap: 7px; margin-top: 9px; color: #8a95a7; font-size: 9px; }",
    ".wm-agent-state { display: flex; align-items: center; gap: 5px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
    ".wm-agent-dot { width: 6px; height: 6px; flex: 0 0 auto; border-radius: 50%; background: #aab3c0; }",
    ".wm-agent-dot.ready { background: #2da36d; box-shadow: 0 0 0 3px #e6f7ee; }",
    ".wm-agent-link { padding: 0; border: 0; color: #7657f6; background: transparent; font-size: 9px; font-weight: 800; }",
    ".wm-agent-link:hover { text-decoration: underline; }",
    ".wm-proposal { margin-top: 15px; padding-top: 14px; border-top: 1px solid #edf0f5; }",
    ".wm-proposal-head { display: flex; justify-content: space-between; margin-bottom: 7px; }",
    ".wm-proposal-head strong { color: #4a566b; font-size: 10px; }",
    ".wm-proposal-head span { color: #2da36d; font-size: 9px; font-weight: 800; }",
    ".wm-reason { margin-bottom: 8px; color: #8490a2; font-size: 10px; line-height: 1.5; }",
    ".wm-code { max-height: 140px; overflow: auto; margin: 0; padding: 10px; border: 1px solid #e9ecf3; border-radius: 8px; color: #69758b; background: #f8f9fc; font: 9px/1.65 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; word-break: break-word; }",
    ".wm-proposal-actions { display: flex; gap: 7px; margin-top: 9px; }",
    ".wm-apply, .wm-discard { flex: 1; padding: 8px 7px; border-radius: 7px; font-size: 10px; font-weight: 800; }",
    ".wm-apply { border: 0; color: #fff; background: #2da36d; }",
    ".wm-apply:disabled { cursor: wait; opacity: .55; }",
    ".wm-apply:hover { background: #238d5d; }",
    ".wm-discard { border: 1px solid #e4e8ef; color: #7b8798; background: #fff; }",
    ".wm-discard:hover { background: #fafbfc; }",
    ".wm-toolbar { display: flex; gap: 7px; margin-top: 14px; padding-top: 13px; border-top: 1px solid #edf0f5; }",
    ".wm-toolbar button { flex: 1; padding: 7px 6px; border: 1px solid #e6e9f0; border-radius: 7px; color: #7d899b; background: #fff; font-size: 9px; }",
    ".wm-toolbar button:hover { border-color: #d2cbff; color: #6852db; background: #faf9ff; }",
    ".wm-foot { display: flex; gap: 6px; align-items: flex-start; margin-top: 13px; color: #a0aaba; font-size: 9px; line-height: 1.5; }",
    ".wm-foot b { color: #8068f7; font-weight: 800; }",
    ".wm-settings-backdrop { position: absolute; inset: 0; z-index: 5; display: grid; place-items: center; padding: 14px; background: rgba(32, 40, 56, .24); backdrop-filter: blur(3px); }",
    ".wm-settings-backdrop[hidden] { display: none; }",
    ".wm-settings-card { width: 100%; padding: 15px; border: 1px solid #e5e8f0; border-radius: 14px; background: #fff; box-shadow: 0 18px 45px rgba(31, 40, 63, .22); }",
    ".wm-settings-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }",
    ".wm-settings-head strong { color: #364155; font-size: 13px; }",
    ".wm-settings-close { border: 0; color: #8a95a6; background: transparent; font-size: 17px; }",
    ".wm-settings-copy { margin: 0 0 12px; color: #8a95a6; font-size: 9px; line-height: 1.5; }",
    ".wm-settings-label { display: block; margin-top: 9px; color: #68758a; font-size: 9px; font-weight: 800; }",
    ".wm-settings-input { width: 100%; box-sizing: border-box; margin-top: 5px; padding: 8px 9px; border: 1px solid #e0e5ee; border-radius: 7px; outline: none; color: #3f4c61; background: #fff; font: 10px/1.3 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }",
    ".wm-settings-input:focus { border-color: #bdb2ff; box-shadow: 0 0 0 3px #f2f0ff; }",
    ".wm-settings-actions { display: flex; gap: 6px; margin-top: 14px; }",
    ".wm-settings-actions button { flex: 1; padding: 8px; border-radius: 7px; font-size: 10px; font-weight: 800; }",
    ".wm-settings-save { border: 0; color: #fff; background: #7657f6; }",
    ".wm-settings-cancel { border: 1px solid #e4e8ef; color: #7b8798; background: #fff; }",
    ".wm-settings-test { border: 1px solid #dcd7ff; color: #6852db; background: #faf9ff; }",
    ".wm-settings-test:disabled { cursor: wait; opacity: .6; }",
    ".wm-settings-feedback { min-height: 13px; margin-top: 8px; color: #8a95a7; font-size: 9px; line-height: 1.45; }",
    ".wm-settings-feedback.success { color: #2a8f61; }",
    ".wm-settings-feedback.error { color: #c55a5a; }",
    ".wm-settings-note { display: block; margin-top: 10px; color: #a0aaba; font-size: 8px; line-height: 1.45; }",
    ".wm-toast { position: fixed; right: 19px; bottom: 18px; z-index: 4; max-width: 250px; padding: 8px 10px; border: 1px solid #dcefe5; border-radius: 8px; color: #287d59; background: #f2fbf6; box-shadow: 0 8px 20px rgba(38, 120, 82, .12); font-size: 10px; font-weight: 750; opacity: 0; transform: translateY(6px); pointer-events: none; transition: 180ms ease; }",
    ".wm-toast.show { opacity: 1; transform: translateY(0); }",
    "@media (max-width: 480px) { .wm-shell { top: 10px; right: 10px; left: 10px; width: auto; } }"
  ].join("\n");
  shadow.appendChild(uiStyle);

  var panel = document.createElement("div");
  panel.className = "wm-shell";
  panel.innerHTML = [
    '<div class="wm-header">',
    '  <div class="wm-brand"><span class="wm-orb" aria-hidden="true"><svg viewBox="0 0 512 512"><path fill="#7657F6" d="M92 56h112c29 0 52 23 52 52v296c0 29-23 52-52 52H92c-29 0-52-23-52-52V108c0-29 23-52 52-52Z"/><path fill="#4A32B8" d="M308 56h112c29 0 52 23 52 52v296c0 29-23 52-52 52H308c-29 0-52-23-52-52V108c0-29 23-52 52-52Z"/><path fill="#FFF" d="M110 207c-6-11-2-24 9-30l17-9c12-6 26-1 32 11l47 89 19-31c10-17 34-17 44 0l19 31 47-89c6-12 20-17 32-11l17 9c11 6 15 19 9 30l-76 143c-6 12-19 19-32 17-7-1-13-6-17-12l-21-34-21 34c-4 6-10 11-17 12-13 2-26-5-32-17Z"/></svg></span><span>WebMeld</span><span class="wm-badge">MVP</span></div>',
    '  <div class="wm-header-actions"><button class="wm-settings" data-action="settings" type="button" aria-label="' + uiText("Agent settings", "Agent 设置") + '">⚙</button><button class="wm-close" data-action="close" type="button" aria-label="' + uiText("Close", "关闭") + '">×</button></div>',
    '</div>',
    '<div class="wm-body">',
    '  <button class="wm-select" data-action="inspect" type="button">⌖ ' + uiText("Select a page element", "选择页面元素") + '</button>',
    '  <div class="wm-selected">',
    '    <div class="wm-selected-head"><small>' + uiText("Current target", "当前目标") + '</small><span class="wm-target-status" data-role="selected-status">' + uiText("Not selected", "未选择") + '</span></div>',
    '    <strong data-role="selected-label">' + uiText("Nothing selected", "还没有选择") + '</strong>',
    '    <code data-role="selected-selector">' + uiText("Start with the button above", "先点击上面的按钮") + '</code>',
    '    <div class="wm-target-meta"><span data-role="selected-type">HTML</span><span data-role="selected-size">—</span></div>',
    '    <pre class="wm-selected-html" data-role="selected-html">' + uiText("Select an element to inspect its HTML", "点击页面元素后，这里会显示 HTML 预览") + '</pre>',
    '  </div>',
    '  <label class="wm-label" for="wm-prompt">' + uiText("What should change?", "你想怎么改？") + '<span>' + uiText("Use plain language", "自然语言即可") + '</span></label>',
    '  <textarea class="wm-prompt" data-role="prompt" placeholder="' + uiText("Select an element, then describe the change", "先选择一个元素，再说说你想怎么改") + '"></textarea>',
    '  <div class="wm-chips">',
    '    <button class="wm-chip" data-prompt="' + uiText("Make it larger, editorial, and deep navy", "让它更有杂志感，字大一点，颜色深蓝色") + '" type="button">' + uiText("Editorial", "杂志感") + '</button>',
    '    <button class="wm-chip" data-prompt="' + uiText("Hide this element", "把这个元素隐藏掉") + '" type="button">' + uiText("Hide", "隐藏") + '</button>',
    '    <button class="wm-chip" data-prompt="' + uiText("Make it narrower and easier to read", "让它变窄一点，更适合阅读") + '" type="button">' + uiText("Readability", "舒适阅读") + '</button>',
    '    <button class="wm-chip" data-prompt="' + uiText("Use a warmer background and softer corners", "变成暖色，圆角多一点") + '" type="button">' + uiText("Softer", "柔和一点") + '</button>',
    '  </div>',
    '  <button class="wm-generate" data-action="generate" type="button">✦ ' + uiText("Generate suggestion", "生成修改建议") + '</button>',
    '  <div class="wm-agent-line"><span class="wm-agent-state"><i class="wm-agent-dot" data-role="agent-dot"></i><span data-role="agent-status">' + uiText("Local demo rules", "本地演示规则") + '</span></span><button class="wm-agent-link" data-action="settings" type="button">' + uiText("Configure Agent", "配置 Agent") + '</button></div>',
    '  <section class="wm-proposal" data-role="proposal" hidden>',
    '    <div class="wm-proposal-head"><strong>' + uiText("Suggested change", "修改建议") + '</strong><span data-role="proposal-count"></span></div>',
    '    <div class="wm-reason" data-role="reason"></div>',
    '    <pre class="wm-code" data-role="code"></pre>',
    '    <div class="wm-proposal-actions"><button class="wm-apply" data-action="apply" type="button">' + uiText("Apply change", "应用修改") + '</button><button class="wm-discard" data-action="discard" type="button">' + uiText("Discard", "放弃") + '</button></div>',
    '  </section>',
    '  <div class="wm-toolbar"><button data-action="undo" type="button">↶ ' + uiText("Undo last change", "撤销上一版") + '</button><button data-action="export" type="button">' + uiText("Export UserCSS", "导出 UserCSS") + '</button></div>',
    '  <div class="wm-foot"><b>⌁</b><span>' + uiText("Preview first. Save only after approval. Rules stay local and do not require Stylus.", "先预览，确认后才保存。规则存在浏览器本地，不依赖 Stylus。") + '</span></div>',
    '</div>',
    '<div class="wm-settings-backdrop" data-role="settings" hidden>',
    '  <div class="wm-settings-card">',
    '    <div class="wm-settings-head"><strong>' + uiText("Agent settings", "Agent 设置") + '</strong><button class="wm-settings-close" data-action="settings-close" type="button" aria-label="' + uiText("Close settings", "关闭设置") + '">×</button></div>',
    '    <p class="wm-settings-copy">' + uiText("Use any OpenAI-compatible Chat Completions endpoint. WebMeld sends the selected element context and your instruction directly to this URL.", "支持 OpenAI-compatible Chat Completions 接口。WebMeld 会把选中的元素上下文和你的描述发给这个 URL。") + '</p>',
    '    <label class="wm-settings-label">URL<input class="wm-settings-input" data-role="agent-url" type="url" placeholder="https://api.example.com/v1/chat/completions"></label>',
    '    <label class="wm-settings-label">' + uiText("LLM / model", "LLM / 模型名") + '<input class="wm-settings-input" data-role="agent-model" type="text" placeholder="' + uiText("For example: gpt-5 or your model name", "例如：gpt-5.6 或你的模型名") + '"></label>',
    '    <label class="wm-settings-label">Key<input class="wm-settings-input" data-role="agent-key" type="password" placeholder="' + uiText("Enter a key; leave blank to keep the saved key", "填入 key；已保存时留空保持不变") + '"></label>',
    '    <div class="wm-settings-actions"><button class="wm-settings-cancel" data-action="settings-close" type="button">' + uiText("Cancel", "取消") + '</button><button class="wm-settings-test" data-action="agent-test" type="button">' + uiText("Test connection", "测试连接") + '</button><button class="wm-settings-save" data-action="settings-save" type="button">' + uiText("Save", "保存配置") + '</button></div>',
    '    <div class="wm-settings-feedback" data-role="agent-test-status" aria-live="polite"></div>',
    '    <small class="wm-settings-note">' + uiText("Your key stays in this extension's local Chrome storage. Requests go directly from the extension to the URL you provide.", "Key 只保存在当前 Chrome 扩展的本地存储中，不会发送给 WebMeld 服务器；请求会直接从扩展后台发往你填写的 URL。") + '</small>',
    '  </div>',
    '</div>',
    '<div class="wm-toast" data-role="toast" role="status"></div>'
  ].join("\n");
  shadow.appendChild(panel);

  var ui = {
    inspect: shadow.querySelector('[data-action="inspect"]'),
    prompt: shadow.querySelector('[data-role="prompt"]'),
    generate: shadow.querySelector('[data-action="generate"]'),
    proposal: shadow.querySelector('[data-role="proposal"]'),
    apply: shadow.querySelector('[data-action="apply"]'),
    reason: shadow.querySelector('[data-role="reason"]'),
    code: shadow.querySelector('[data-role="code"]'),
    count: shadow.querySelector('[data-role="proposal-count"]'),
    label: shadow.querySelector('[data-role="selected-label"]'),
    selector: shadow.querySelector('[data-role="selected-selector"]'),
    selectedStatus: shadow.querySelector('[data-role="selected-status"]'),
    selectedType: shadow.querySelector('[data-role="selected-type"]'),
    selectedSize: shadow.querySelector('[data-role="selected-size"]'),
    selectedHtml: shadow.querySelector('[data-role="selected-html"]'),
    agentDot: shadow.querySelector('[data-role="agent-dot"]'),
    agentStatus: shadow.querySelector('[data-role="agent-status"]'),
    settings: shadow.querySelector('[data-role="settings"]'),
    agentUrl: shadow.querySelector('[data-role="agent-url"]'),
    agentModel: shadow.querySelector('[data-role="agent-model"]'),
    agentKey: shadow.querySelector('[data-role="agent-key"]'),
    agentTest: shadow.querySelector('[data-action="agent-test"]'),
    agentTestStatus: shadow.querySelector('[data-role="agent-test-status"]'),
    toast: shadow.querySelector('[data-role="toast"]')
  };

  function storageGet() {
    return new Promise(function (resolve, reject) {
      if (!chrome || !chrome.storage || !chrome.storage.local) {
        resolve({});
        return;
      }
      chrome.storage.local.get([STORAGE_KEY], function (value) {
        resolve(value || {});
      });
    });
  }

  function storageSet(value) {
    return new Promise(function (resolve, reject) {
      if (!chrome || !chrome.storage || !chrome.storage.local) {
        resolve();
        return;
      }
      var payload = {};
      payload[STORAGE_KEY] = value;
      chrome.storage.local.set(payload, function () {
        var error = chrome.runtime && chrome.runtime.lastError;
        if (error) reject(new Error(error.message || uiText("Local browser storage failed.", "浏览器本地存储失败。")));
        else resolve();
      });
    });
  }

  function agentConfigGet() {
    return new Promise(function (resolve) {
      if (!chrome || !chrome.storage || !chrome.storage.local) {
        resolve({});
        return;
      }
      chrome.storage.local.get([AGENT_CONFIG_KEY], function (value) {
        resolve(value && value[AGENT_CONFIG_KEY] ? value[AGENT_CONFIG_KEY] : {});
      });
    });
  }

  function agentConfigSet(value) {
    return new Promise(function (resolve, reject) {
      if (!chrome || !chrome.storage || !chrome.storage.local) {
        resolve();
        return;
      }
      var payload = {};
      payload[AGENT_CONFIG_KEY] = value;
      chrome.storage.local.set(payload, function () {
        var error = chrome.runtime && chrome.runtime.lastError;
        if (error) reject(new Error(error.message || uiText("Local browser storage failed.", "浏览器本地存储失败。")));
        else resolve();
      });
    });
  }

  function hasAgentConfig() {
    return Boolean(state.agentConfig.url && state.agentConfig.model && state.agentConfig.key);
  }

  function renderAgentStatus() {
    var ready = hasAgentConfig();
    ui.agentDot.classList.toggle("ready", ready);
    ui.agentStatus.textContent = ready ? "Agent · " + state.agentConfig.model : uiText("Local rules · Agent not configured", "本地演示规则 · 未配置 Agent");
  }

  function loadAgentConfig() {
    agentConfigGet().then(function (config) {
      state.agentConfig = {
        url: String(config.url || "").trim(),
        model: String(config.model || "").trim(),
        key: String(config.key || "").trim()
      };
      renderAgentStatus();
    });
  }

  function openSettings() {
    ui.agentUrl.value = state.agentConfig.url;
    ui.agentModel.value = state.agentConfig.model;
    ui.agentKey.value = "";
    ui.agentKey.placeholder = state.agentConfig.key
      ? uiText("A key is saved; leave blank to keep it", "已保存 key；留空保持不变")
      : uiText("Enter a key", "填入 key");
    ui.settings.hidden = false;
    ui.agentUrl.focus();
  }

  function closeSettings() {
    ui.settings.hidden = true;
  }

  function saveAgentConfig() {
    var next = readAgentForm();
    var previous = state.agentConfig;
    state.agentConfig = next;
    agentConfigSet(next).then(function () {
      renderAgentStatus();
      closeSettings();
      showToast(hasAgentConfig()
        ? uiText("Agent settings saved. The next generation will use it.", "Agent 配置已保存，下次生成会调用它。")
        : uiText("Settings saved, but URL, model, and key are not complete.", "配置已保存，但 URL、模型和 key 还没有填完整。"));
    }).catch(function (error) {
      state.agentConfig = previous;
      renderAgentStatus();
      showToast(error.message || uiText("Could not save Agent settings.", "Agent 配置保存失败。"));
    });
  }

  function readAgentForm() {
    return {
      url: String(ui.agentUrl.value || "").trim(),
      model: String(ui.agentModel.value || "").trim(),
      key: String(ui.agentKey.value || "").trim() || state.agentConfig.key
    };
  }

  function setAgentTestStatus(message, kind) {
    ui.agentTestStatus.textContent = message || "";
    ui.agentTestStatus.className = "wm-settings-feedback" + (kind ? " " + kind : "");
  }

  function testAgentConnection() {
    var config = readAgentForm();
    if (!config.url || !config.model || !config.key) {
      setAgentTestStatus(uiText("Enter a URL, model, and key first.", "请先填写 URL、模型名和 key。"), "error");
      return;
    }
    ui.agentTest.disabled = true;
    ui.agentTest.textContent = uiText("Testing…", "测试中…");
    setAgentTestStatus(uiText("Connecting to the Agent and validating its response…", "正在连接 Agent，并校验返回格式…"));
    chrome.runtime.sendMessage({ type: "WEBMELD_AGENT_TEST", config: config }, function (response) {
      ui.agentTest.disabled = false;
      ui.agentTest.textContent = uiText("Test connection", "测试连接");
      if (chrome.runtime.lastError) {
        setAgentTestStatus(chrome.runtime.lastError.message || uiText("Could not reach the Agent service worker.", "无法连接 Agent 后台。"), "error");
        return;
      }
      if (!response || !response.ok || !response.plan) {
        setAgentTestStatus(response && response.error ? response.error : uiText("The Agent did not return a valid suggestion.", "Agent 没有返回有效修改建议。"), "error");
        return;
      }
      var count = Array.isArray(response.plan.declarations) ? response.plan.declarations.length : 0;
      setAgentTestStatus(uiText(
        "Connected · received " + count + " valid CSS declaration" + (count === 1 ? "" : "s") + ". Save to start editing.",
        "连接成功 · 已收到 " + count + " 条可解析 CSS。保存配置后即可用于页面修改。"
      ), "success");
    });
  }

  function pageRules() {
    return state.rules.filter(function (rule) { return rule.pageKey === PAGE_KEY; });
  }

  function renderRules() {
    var old = document.getElementById("webmeld-style");
    if (old) old.remove();
    var rules = pageRules();
    if (!rules.length) return;
    var style = document.createElement("style");
    style.id = "webmeld-style";
    style.dataset.webmeld = "true";
    style.textContent = rules.map(function (rule) {
      return rule.selector + " {\n" + rule.declarations.map(function (item) {
        return "  " + item;
      }).join("\n") + "\n}";
    }).join("\n\n");
    document.documentElement.appendChild(style);
  }

  function loadRules() {
    storageGet().then(function (value) {
      state.rules = Array.isArray(value[STORAGE_KEY]) ? value[STORAGE_KEY] : [];
      renderRules();
    });
  }

  function saveRules() {
    return storageSet(state.rules);
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, function (char) {
      return "\\" + char.charCodeAt(0).toString(16) + " ";
    });
  }

  function uniqueSelector(element) {
    if (!(element instanceof Element)) return "body";
    if (element.id) {
      var idSelector = "#" + cssEscape(element.id);
      if (document.querySelectorAll(idSelector).length === 1) return idSelector;
    }
    var parts = [];
    var current = element;
    var depth = 0;
    while (current && current.nodeType === 1 && current !== document.documentElement && depth < 7) {
      var part = current.tagName.toLowerCase();
      var classes = Array.from(current.classList || []).filter(function (name) {
        return /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(name) && name.length < 36 && !/^(active|selected|focus|hover|open)$/.test(name);
      }).slice(0, 2);
      if (classes.length) part += "." + classes.map(cssEscape).join(".");
      var parent = current.parentElement;
      if (parent) {
        var siblings = Array.from(parent.children).filter(function (child) {
          return child.tagName === current.tagName;
        });
        if (siblings.length > 1) part += ":nth-of-type(" + (siblings.indexOf(current) + 1) + ")";
      }
      parts.unshift(part);
      var candidate = parts.join(" > ");
      try {
        if (document.querySelectorAll(candidate).length === 1) return candidate;
      } catch (error) {}
      current = parent;
      depth += 1;
    }
    return parts.join(" > ") || "body";
  }

  function textLabel(element) {
    if (!element) return uiText("Nothing selected", "还没有选择");
    var label = element.getAttribute("aria-label") || element.getAttribute("alt") || element.innerText || element.textContent || element.tagName;
    label = String(label).replace(/\s+/g, " ").trim();
    if (!label) label = element.tagName.toLowerCase();
    return label.length > 42 ? label.slice(0, 39) + "…" : label;
  }

  function elementIdentity(element) {
    if (!element) return "HTML";
    var tag = element.tagName.toLowerCase();
    var id = element.id ? "#" + element.id : "";
    var classes = Array.from(element.classList || []).filter(function (name) {
      return name.length < 24 && !/^(active|selected|focus|hover|open)$/.test(name);
    }).slice(0, 2).map(function (name) { return "." + name; }).join("");
    return tag + id + classes;
  }

  function htmlPreview(element) {
    if (!element) return uiText("Select an element to inspect its HTML", "点击页面元素后，这里会显示 HTML 预览");
    var html = String(element.outerHTML || "").replace(/\s+/g, " ").trim();
    return html.length > 260 ? html.slice(0, 257) + "…" : html;
  }

  function updateTargetCard(element) {
    if (!element) {
      ui.selectedStatus.textContent = uiText("Not selected", "未选择");
      ui.selectedStatus.classList.remove("ready");
      ui.selectedType.textContent = "HTML";
      ui.selectedSize.textContent = "—";
      ui.selectedHtml.textContent = uiText("Select an element to inspect its HTML", "点击页面元素后，这里会显示 HTML 预览");
      return;
    }
    var rect = element.getBoundingClientRect();
    ui.selectedStatus.textContent = uiText("Selected", "已选中");
    ui.selectedStatus.classList.add("ready");
    ui.selectedType.textContent = elementIdentity(element);
    ui.selectedSize.textContent = Math.round(rect.width) + " × " + Math.round(rect.height);
    ui.selectedHtml.textContent = htmlPreview(element);
  }

  function readFontSize(element) {
    if (!element) return null;
    var value = parseFloat(window.getComputedStyle(element).fontSize);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function requestedFontDirection(promptText) {
    var text = normalizePrompt(promptText);
    text = text.toLowerCase();
    if (hasAny(text, ["大一点", "更大", "放大", "增大", "字体变大", "字号变大", "醒目", "larger", "bigger", "increase", "enlarge", "editorial", "prominent"])) return 1;
    if (hasAny(text, ["小一点", "更小", "缩小", "减小", "字体变小", "字号变小", "smaller", "decrease", "shrink", "reduce"])) return -1;
    return 0;
  }

  function declarationProperty(declaration) {
    var match = String(declaration || "").match(/^\s*([a-zA-Z][a-zA-Z0-9-]*)\s*:/);
    return match ? match[1].toLowerCase() : "";
  }

  function snapshotComputedStyles(element, declarations) {
    var values = {};
    if (!element) return values;
    var computed = window.getComputedStyle(element);
    declarations.forEach(function (declaration) {
      var property = declarationProperty(declaration);
      if (!property || Object.prototype.hasOwnProperty.call(values, property)) return;
      values[property] = String(computed.getPropertyValue(property) || "").replace(/\s+/g, " ").trim();
    });
    return values;
  }

  function sameComputedValue(first, second) {
    return String(first || "").replace(/\s+/g, " ").trim() === String(second || "").replace(/\s+/g, " ").trim();
  }

  function verifyComputedChange(element, before, declarations) {
    var after = snapshotComputedStyles(element, declarations);
    var changed = [];
    Object.keys(after).forEach(function (property) {
      if (!sameComputedValue(before[property], after[property])) changed.push(property);
    });
    return { before: before, after: after, changed: changed };
  }

  function shortComputedValue(value) {
    var text = String(value || "∅");
    return text.length > 34 ? text.slice(0, 31) + "…" : text;
  }

  function verificationSummary(verification) {
    var changes = verification.changed.slice(0, 3).map(function (property) {
      return property + " " + shortComputedValue(verification.before[property]) + " → " + shortComputedValue(verification.after[property]);
    });
    if (verification.changed.length > 3) changes.push(uiText("plus " + (verification.changed.length - 3) + " more", "还有 " + (verification.changed.length - 3) + " 项"));
    return changes.join(uiText("; ", "；"));
  }

  function highlightElement(element) {
    if (!element || element === document.documentElement || element === document.body) {
      highlight.style.display = "none";
      return;
    }
    var rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      highlight.style.display = "none";
      return;
    }
    highlight.style.display = "block";
    highlight.style.top = Math.max(4, rect.top - 4) + "px";
    highlight.style.left = Math.max(4, rect.left - 4) + "px";
    highlight.style.width = Math.max(8, rect.width + 8) + "px";
    highlight.style.height = Math.max(8, rect.height + 8) + "px";
    highlight.dataset.label = elementIdentity(element) + " · " + textLabel(element);
    highlight.dataset.meta = Math.round(rect.width) + " × " + Math.round(rect.height) + " px · " + uiText("click to select", "点击选中");
  }

  function isUiEvent(event) {
    return event.composedPath().indexOf(host) !== -1;
  }

  function eventElement(event) {
    var path = event.composedPath();
    for (var index = 0; index < path.length; index += 1) {
      var node = path[index];
      if (!(node instanceof Element)) continue;
      if (node === host || host.contains(node)) return null;
      if (node.id === "webmeld-highlight") continue;
      if (/^(SCRIPT|STYLE|META|LINK|HTML|BODY|HEAD)$/.test(node.tagName)) continue;
      return node;
    }
    return null;
  }

  function setSelected(element) {
    if (state.selected && state.selected !== element) state.selected.removeAttribute("data-webmeld-selected");
    state.selected = element;
    state.selectedMetrics = element ? { fontSize: readFontSize(element) } : null;
    if (element) {
      element.setAttribute("data-webmeld-selected", "true");
      ui.label.textContent = textLabel(element);
      ui.selector.textContent = uniqueSelector(element);
      ui.prompt.placeholder = uiText("For example: hide it, or make it easier to read", "例如：把它隐藏掉，或者让它更适合阅读");
      updateTargetCard(element);
      highlightElement(element);
    } else {
      ui.label.textContent = uiText("Nothing selected", "还没有选择");
      ui.selector.textContent = uiText("Start with the button above", "先点击上面的按钮");
      updateTargetCard(null);
    }
  }

  function clearSelection() {
    if (state.selected) state.selected.removeAttribute("data-webmeld-selected");
    state.selected = null;
    state.selectedMetrics = null;
    updateTargetCard(null);
    ui.label.textContent = uiText("Nothing selected", "还没有选择");
    ui.selector.textContent = uiText("Start with the button above", "先点击上面的按钮");
    highlight.style.display = "none";
  }

  function startInspecting() {
    state.inspecting = true;
    ui.inspect.classList.add("active");
    ui.inspect.textContent = "✕ " + uiText("Click an element on the page", "点击页面中的元素");
  }

  function stopInspecting() {
    state.inspecting = false;
    ui.inspect.classList.remove("active");
    ui.inspect.textContent = "⌖ " + uiText("Select a page element", "选择页面元素");
    if (state.selected && state.open) highlightElement(state.selected);
    else highlight.style.display = "none";
    state.highlighted = null;
  }

  function clearPreview() {
    var preview = document.getElementById("webmeld-preview");
    if (preview) preview.remove();
  }

  function normalizePrompt(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function hasAny(text, words) {
    return words.some(function (word) { return text.indexOf(word) !== -1; });
  }

  function interpretPrompt(promptText) {
    if (!state.selected) return { error: uiText("Select a page element first.", "先点“选择页面元素”，再点击网页中的目标。") };
    var text = normalizePrompt(promptText);
    if (!text) return { error: uiText("Describe the change first.", "先说说你想怎么改。") };
    var searchText = text.toLowerCase();
    var declarations = [];
    var reasons = [];
    var fontSizeBefore = state.selectedMetrics && state.selectedMetrics.fontSize;
    var fontSizeAfter = null;
    var fontSizeDirection = requestedFontDirection(text);
    if (hasAny(searchText, ["隐藏", "去掉", "不显示", "移除", "hide", "remove"])) {
      declarations.push("display: none !important;");
      reasons.push(uiText("hide the target", "隐藏目标"));
    }
    if (hasAny(searchText, ["大一点", "更大", "放大", "杂志感", "醒目", "larger", "bigger", "increase", "enlarge", "editorial", "prominent"])) {
      if (fontSizeBefore !== null && fontSizeBefore !== undefined) {
        fontSizeAfter = Math.round(fontSizeBefore * 1.35 * 100) / 100;
        declarations.push("font-size: " + fontSizeAfter + "px !important;");
        reasons.push(uiText(
          "increase the current font size by 35% (" + fontSizeBefore + "px → " + fontSizeAfter + "px)",
          "按当前字号放大 35%（" + fontSizeBefore + "px → " + fontSizeAfter + "px）"
        ));
      } else {
        reasons.push(uiText("skip font sizing because the current value could not be read", "没有读取到当前字号，跳过字号调整"));
      }
      declarations.push("letter-spacing: -0.035em;");
      reasons.push(uiText("tighten letter spacing", "收紧字距"));
    }
    if (hasAny(searchText, ["小一点", "更小", "缩小", "减小", "字体变小", "字号变小", "smaller", "decrease", "shrink", "reduce"])) {
      if (fontSizeBefore !== null && fontSizeBefore !== undefined) {
        fontSizeAfter = Math.round(fontSizeBefore * 0.8 * 100) / 100;
        declarations.push("font-size: " + fontSizeAfter + "px !important;");
        reasons.push(uiText(
          "reduce the current font size by 20% (" + fontSizeBefore + "px → " + fontSizeAfter + "px)",
          "按当前字号缩小 20%（" + fontSizeBefore + "px → " + fontSizeAfter + "px）"
        ));
      } else {
        reasons.push(uiText("skip font sizing because the current value could not be read", "没有读取到当前字号，跳过字号调整"));
      }
    }
    if (hasAny(searchText, ["深蓝", "蓝色", "蓝", "deep navy", "navy", "blue"])) {
      declarations.push("color: #173b63 !important;");
      reasons.push(uiText("use deep navy text", "改成深蓝色"));
    } else if (hasAny(searchText, ["黑色", "深色", "black", "darker", "dark text"])) {
      declarations.push("color: #202838 !important;");
      reasons.push(uiText("use darker text", "改成深色"));
    }
    if (hasAny(searchText, ["暖色", "温柔", "米色", "柔和", "warm", "warmer", "beige", "soft background"])) {
      declarations.push("background-color: #fff8ef !important;");
      reasons.push(uiText("use a warmer background", "换成暖色背景"));
    }
    if (hasAny(searchText, ["圆角", "柔和", "rounded", "rounder", "soft corners", "softer corners"])) {
      declarations.push("border-radius: 16px !important;");
      reasons.push(uiText("add softer corners", "增加圆角"));
    }
    if (hasAny(searchText, ["变窄", "窄一点", "适合阅读", "阅读", "narrower", "readable", "readability", "easier to read", "reading width"])) {
      declarations.push("max-width: 720px !important;");
      declarations.push("margin-left: auto !important;");
      declarations.push("margin-right: auto !important;");
      reasons.push(uiText("use a comfortable reading width", "收窄内容宽度"));
    }
    if (hasAny(searchText, ["留白", "间距", "松一点", "舒服", "padding", "more space", "spacing", "breathe", "roomier"])) {
      declarations.push("padding: 20px !important;");
      reasons.push(uiText("add internal spacing", "增加内边距"));
    }
    if (hasAny(searchText, ["淡一点", "弱化", "不抢眼", "subtle", "faded", "muted", "less prominent"])) {
      declarations.push("opacity: .62 !important;");
      reasons.push(uiText("reduce visual emphasis", "降低视觉强度"));
    }
    if (!declarations.length) {
      declarations.push("outline: 2px solid #7657f6 !important;");
      reasons.push(uiText("mark the target for preview", "先标记目标"));
    }
    var reason = reasons.join(uiText(", ", "，"));
    if (!reason) reason = uiText("Generated a previewable style rule", "已生成一条可预览的样式规则");
    return {
      selector: uniqueSelector(state.selected),
      declarations: declarations,
      reason: reason + uiText(". Approve it to save this change for the current site.", "。确认后会保存到当前网站。"),
      prompt: text,
      fontSizeBefore: fontSizeBefore,
      fontSizeAfter: fontSizeAfter,
      fontSizeDirection: fontSizeDirection
    };
  }

  function selectedContext() {
    if (!state.selected) return null;
    var computed = window.getComputedStyle(state.selected);
    var rect = state.selected.getBoundingClientRect();
    return {
      uiLanguage: IS_ZH ? "zh-CN" : "en",
      page: {
        url: location.href,
        title: document.title
      },
      target: {
        selector: uniqueSelector(state.selected),
        identity: elementIdentity(state.selected),
        tag: state.selected.tagName.toLowerCase(),
        text: textLabel(state.selected),
        html: htmlPreview(state.selected),
        rect: { width: Math.round(rect.width), height: Math.round(rect.height) },
        computed: {
          display: computed.display,
          position: computed.position,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          borderRadius: computed.borderRadius,
          maxWidth: computed.maxWidth,
          padding: computed.padding,
          margin: computed.margin
        }
      },
      instruction: normalizePrompt(ui.prompt.value)
    };
  }

  function requestAgentPlan(context) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage({ type: "WEBMELD_AGENT_REQUEST", context: context }, function (response) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || uiText("Could not reach the Agent service worker.", "无法连接 Agent 后台。")));
          return;
        }
        if (!response || !response.ok || !response.plan) {
          reject(new Error(response && response.error ? response.error : uiText("The Agent did not return a suggestion.", "Agent 没有返回修改建议。")));
          return;
        }
        resolve(response.plan);
      });
    });
  }

  function normalizeAgentPlan(plan) {
    var declarations = Array.isArray(plan.declarations) ? plan.declarations.map(function (item) {
      return String(item || "").trim();
    }).filter(Boolean) : [];
    if (!declarations.length || declarations.length > 24) throw new Error(uiText("The Agent returned an empty or oversized CSS plan.", "Agent 返回的 CSS 为空或过多。"));
    declarations.forEach(function (item) {
      if (!/^[a-zA-Z][a-zA-Z0-9-]*\s*:\s*[^;{}]+;?$/.test(item)) {
        throw new Error(uiText("The Agent returned CSS that cannot be previewed safely.", "Agent 返回了无法预览的 CSS。"));
      }
      if (/url\s*\(|expression\s*\(|-moz-binding|behavior\s*:|javascript\s*:/i.test(item)) {
        throw new Error(uiText("The Agent returned blocked CSS content.", "Agent 返回了被禁止的 CSS 内容。"));
      }
      if (/^font-size\s*:/i.test(item) && !/\b[0-9.]+px\b/i.test(item)) {
        throw new Error(uiText("Font-size changes must use a concrete px value.", "字号修改必须返回具体 px 值，避免相对单位造成反向变化。"));
      }
    });
    return {
      selector: uniqueSelector(state.selected),
      declarations: declarations.map(function (item) { return item.endsWith(";") ? item : item + ";"; }),
      reason: String(plan.reason || uiText("The Agent generated a previewable CSS change.", "Agent 已生成一组可预览的 CSS 修改。")),
      prompt: normalizePrompt(ui.prompt.value),
      fontSizeDirection: requestedFontDirection(ui.prompt.value)
    };
  }

  function generateLocalOrAgent(button) {
    var localResult = interpretPrompt(ui.prompt.value);
    if (localResult.error) {
      showToast(localResult.error);
      return;
    }
    button.disabled = true;
    button.textContent = hasAgentConfig()
      ? "⌁ " + uiText("Agent is reading the page…", "Agent 正在理解页面…")
      : "⌁ " + uiText("Generating a local suggestion…", "正在生成本地建议…");
    if (hasAgentConfig()) {
      requestAgentPlan(selectedContext()).then(function (plan) {
        showProposal(normalizeAgentPlan(plan));
      }).catch(function (error) {
        showToast(error.message || uiText("Agent request failed.", "Agent 请求失败。"));
      }).finally(function () {
        button.disabled = false;
        button.textContent = "✦ " + uiText("Generate suggestion", "生成修改建议");
      });
      return;
    }
    window.setTimeout(function () {
      showProposal(localResult);
      button.disabled = false;
      button.textContent = "✦ " + uiText("Generate suggestion", "生成修改建议");
    }, 360);
  }

  function ruleText(plan) {
    return plan.selector + " {\n" + plan.declarations.map(function (item) {
      return "  " + item;
    }).join("\n") + "\n}";
  }

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () {
      ui.toast.classList.remove("show");
    }, 2500);
  }

  function rejectPreview(message) {
    clearPreview();
    state.pending = null;
    ui.proposal.hidden = true;
    ui.apply.disabled = true;
    showToast(message);
  }

  function showProposal(plan) {
    if (!state.selected) {
      showToast(uiText("The target no longer exists. Select it again.", "目标元素已经不存在，请重新选择。"));
      return;
    }
    clearPreview();
    if (plan.fontSizeBefore === undefined) plan.fontSizeBefore = readFontSize(state.selected);
    if (plan.fontSizeDirection === undefined) plan.fontSizeDirection = requestedFontDirection(plan.prompt);
    plan.verification = {
      before: snapshotComputedStyles(state.selected, plan.declarations),
      after: {},
      changed: []
    };
    state.pending = plan;
    ui.code.textContent = ruleText(plan);
    ui.count.textContent = uiText(
      plan.declarations.length + " declaration" + (plan.declarations.length === 1 ? "" : "s"),
      plan.declarations.length + " 条样式"
    );
    ui.proposal.hidden = false;
    ui.apply.disabled = true;
    ui.reason.textContent = plan.reason + uiText(" Checking the real page change…", " 正在检查实际页面变化…");
    var preview = document.createElement("style");
    preview.id = "webmeld-preview";
    preview.dataset.webmeld = "preview";
    preview.textContent = ruleText(plan);
    document.documentElement.appendChild(preview);

    window.requestAnimationFrame(function () {
      if (state.pending !== plan || !state.selected) return;
      var verification = verifyComputedChange(state.selected, plan.verification.before, plan.declarations);
      plan.verification = verification;
      if (!verification.changed.length) {
        rejectPreview(uiText("Preview rejected: computed styles did not change. The suggestion was rolled back.", "预览校验失败：页面计算样式没有发生变化，已撤回这次建议。"));
        return;
      }
      var actualFontSize = readFontSize(state.selected);
      var direction = plan.fontSizeDirection || requestedFontDirection(plan.prompt);
      if (actualFontSize !== null && plan.fontSizeBefore !== null && plan.fontSizeBefore !== undefined) {
        if (direction > 0 && actualFontSize <= plan.fontSizeBefore) {
          rejectPreview(uiText("Preview rejected: the font did not become larger. The suggestion was rolled back.", "预览校验失败：字号没有变大，已撤回这次建议。"));
          return;
        }
        if (direction < 0 && actualFontSize >= plan.fontSizeBefore) {
          rejectPreview(uiText("Preview rejected: the font did not become smaller. The suggestion was rolled back.", "预览校验失败：字号没有变小，已撤回这次建议。"));
          return;
        }
      }
      ui.reason.textContent = plan.reason + uiText(" Preview verified: ", " 预览校验通过：") + verificationSummary(verification) + uiText(".", "。");
      ui.apply.disabled = false;
    });
  }

  function applyPending() {
    if (!state.pending || ui.apply.disabled || !state.selected) return;
    var plan = state.pending;
    var previousRules = state.rules.slice();
    ui.apply.disabled = true;
    clearPreview();
    var rule = {
      id: "rule_" + Date.now() + "_" + Math.random().toString(16).slice(2),
      pageKey: PAGE_KEY,
      selector: plan.selector,
      declarations: plan.declarations,
      prompt: plan.prompt,
      createdAt: Date.now()
    };
    state.rules.push(rule);
    renderRules();
    window.requestAnimationFrame(function () {
      if (state.pending !== plan) return;
      var verification = verifyComputedChange(state.selected, plan.verification.before, plan.declarations);
      if (!verification.changed.length) {
        state.rules = previousRules;
        renderRules();
        rejectPreview(uiText("Apply rejected: the page did not actually change. The rule was rolled back.", "应用校验失败：页面没有实际变化，已自动回滚。"));
        return;
      }
      saveRules().then(function () {
        ui.proposal.hidden = true;
        state.pending = null;
        ui.apply.disabled = true;
        showToast(uiText("Change applied. It will return the next time you open this page.", "修改已应用，并会在下次打开此页面时恢复。"));
      }).catch(function (error) {
        state.rules = previousRules;
        renderRules();
        rejectPreview(uiText("Save failed and the change was rolled back: ", "保存失败，修改已自动回滚：") + (error.message || uiText("browser storage is unavailable.", "浏览器存储不可用。")));
      });
    });
  }

  function discardPending() {
    clearPreview();
    state.pending = null;
    ui.proposal.hidden = true;
    ui.apply.disabled = true;
  }

  function undoLast() {
    var rules = pageRules();
    if (!rules.length) {
      showToast(uiText("There are no saved changes to undo on this page.", "当前页面还没有可撤销的修改。"));
      return;
    }
    var last = rules[rules.length - 1];
    var previousRules = state.rules.slice();
    state.rules = state.rules.filter(function (rule) { return rule.id !== last.id; });
    renderRules();
    saveRules().then(function () {
      showToast(uiText("Undid the last change.", "已撤销上一版修改。"));
    }).catch(function (error) {
      state.rules = previousRules;
      renderRules();
      showToast(uiText("Undo could not be saved, so the previous rule was restored: ", "撤销保存失败，已恢复上一版修改：") + (error.message || uiText("browser storage is unavailable.", "浏览器存储不可用。")));
    });
  }

  function exportUserCss() {
    var rules = pageRules();
    if (state.pending) rules = rules.concat([{
      selector: state.pending.selector,
      declarations: state.pending.declarations
    }]);
    if (!rules.length) {
      showToast(uiText("There are no style rules on this page yet.", "当前页面还没有样式规则。"));
      return;
    }
    var css = [
      "/* WebMeld styles for " + location.hostname + " */",
      "@-moz-document url-prefix(" + JSON.stringify(PAGE_KEY) + ") {",
      rules.map(function (rule) {
        return "  " + rule.selector + " {\n" + rule.declarations.map(function (item) {
          return "    " + item;
        }).join("\n") + "\n  }";
      }).join("\n\n"),
      "}"
    ].join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(css).then(function () {
        showToast(uiText("UserCSS copied to the clipboard.", "UserCSS 已复制到剪贴板。"));
      }).catch(function () {
        showToast(uiText("UserCSS generated. Copy it from the suggestion panel.", "已生成 UserCSS，请在修改建议中复制。"));
      });
    } else {
      showToast(uiText("UserCSS generated. Copy it from the suggestion panel.", "已生成 UserCSS，请在修改建议中复制。"));
    }
  }

  function togglePanel() {
    state.open = !state.open;
    host.style.display = state.open ? "block" : "none";
    if (state.open) {
      ui.prompt.focus();
    } else {
      stopInspecting();
      clearPreview();
      state.pending = null;
      ui.proposal.hidden = true;
      ui.apply.disabled = true;
      closeSettings();
      clearSelection();
    }
  }

  shadow.addEventListener("click", function (event) {
    var action = event.target && event.target.dataset ? event.target.dataset.action : "";
    if (action === "close") togglePanel();
    if (action === "settings") openSettings();
    if (action === "settings-close") closeSettings();
    if (action === "settings-save") saveAgentConfig();
    if (action === "agent-test") testAgentConnection();
    if (action === "inspect") startInspecting();
    if (action === "generate") {
      generateLocalOrAgent(event.target);
    }
    if (action === "apply") applyPending();
    if (action === "discard") discardPending();
    if (action === "undo") undoLast();
    if (action === "export") exportUserCss();
    if (event.target && event.target.dataset && event.target.dataset.prompt) {
      ui.prompt.value = event.target.dataset.prompt;
      ui.prompt.focus();
    }
  });

  ui.prompt.addEventListener("keydown", function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      ui.generate.click();
    }
  });

  document.addEventListener("mousemove", function (event) {
    if (!state.inspecting || isUiEvent(event)) return;
    var element = eventElement(event);
    if (!element) return;
    state.highlighted = element;
    highlightElement(element);
  }, true);

  document.addEventListener("click", function (event) {
    if (!state.inspecting || isUiEvent(event)) return;
    var element = eventElement(event);
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    setSelected(element);
    stopInspecting();
  }, true);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (state.inspecting) stopInspecting();
      else if (state.open) togglePanel();
    }
  }, true);

  window.addEventListener("scroll", function () {
    if (state.inspecting && state.highlighted) highlightElement(state.highlighted);
  }, true);

  window.addEventListener("resize", function () {
    if (state.inspecting && state.highlighted) highlightElement(state.highlighted);
  });

  chrome.runtime.onMessage.addListener(function (message) {
    if (message && message.type === "WEBMELD_TOGGLE") togglePanel();
  });

  loadRules();
  loadAgentConfig();

  // Demo-only entry point: append ?webmeldDemo=1 to a page URL to open the panel
  // automatically without changing the normal toolbar/shortcut workflow.
  if (new URLSearchParams(location.search).has("webmeldDemo")) {
    window.setTimeout(function () { togglePanel(); }, 420);
  }
})();
