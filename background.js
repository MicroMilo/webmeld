var AGENT_CONFIG_KEY = "webmeld_agent_config_v1";

chrome.action.onClicked.addListener(function (tab) {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "WEBMELD_TOGGLE" }).catch(function () {});
});

chrome.commands.onCommand.addListener(function (command) {
  if (command !== "toggle-webmeld") return;
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
    var tab = tabs[0];
    if (!tab || !tab.id) return;
    chrome.tabs.sendMessage(tab.id, { type: "WEBMELD_TOGGLE" }).catch(function () {});
  });
});

function readAgentConfig() {
  return new Promise(function (resolve) {
    chrome.storage.local.get([AGENT_CONFIG_KEY], function (value) {
      resolve(value && value[AGENT_CONFIG_KEY] ? value[AGENT_CONFIG_KEY] : {});
    });
  });
}

function extractMessageText(payload) {
  if (payload && payload.choices && payload.choices[0] && payload.choices[0].message) {
    var content = payload.choices[0].message.content;
    if (Array.isArray(content)) {
      return content.map(function (item) {
        return typeof item === "string" ? item : (item && (item.text || item.content) ? (item.text || item.content) : "");
      }).join("");
    }
    return content || "";
  }
  if (payload && payload.output_text) return payload.output_text;
  if (payload && Array.isArray(payload.output)) {
    return payload.output.map(function (item) {
      return item && Array.isArray(item.content) ? item.content.map(function (part) {
        return part && (part.text || part.value) ? (part.text || part.value) : "";
      }).join("") : "";
    }).join("");
  }
  return "";
}

function parseJsonPlan(rawText) {
  var text = String(rawText || "").trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  var parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error("模型没有返回有效 JSON。");
  }
  var declarations = Array.isArray(parsed.declarations) ? parsed.declarations : [];
  if (!declarations.length || declarations.length > 24) {
    throw new Error("模型返回的 CSS 修改为空或过多。");
  }
  declarations = declarations.map(function (declaration) {
    var item = String(declaration || "").trim();
    if (!/^[a-zA-Z][a-zA-Z0-9-]*\s*:\s*[^;{}]+;?$/.test(item)) {
      throw new Error("模型返回了无法安全预览的 CSS。");
    }
    if (/url\s*\(|expression\s*\(|-moz-binding|behavior\s*:|javascript\s*:/i.test(item)) {
      throw new Error("模型返回了被禁止的 CSS 内容。");
    }
    return item.endsWith(";") ? item : item + ";";
  });
  return {
    declarations: declarations,
    reason: String(parsed.reason || "Agent 已生成一组可预览的 CSS 修改。")
  };
}

function testContext() {
  return {
    page: {
      url: "https://webmeld.local/connection-test",
      title: "WebMeld connection test"
    },
    target: {
      selector: "body",
      identity: "body",
      tag: "body",
      text: "WebMeld connection test",
      html: "<body>WebMeld connection test</body>",
      rect: { width: 1, height: 1 },
      computed: {
        display: "block",
        fontSize: "16px",
        fontWeight: "400",
        lineHeight: "normal",
        color: "rgb(0, 0, 0)",
        backgroundColor: "rgba(0, 0, 0, 0)",
        borderRadius: "0px",
        maxWidth: "none",
        padding: "0px",
        margin: "0px"
      }
    },
    instruction: "这是连接测试。请只返回一条安全的 CSS 声明，例如 outline: 1px solid #7657f6;，不要执行任何页面修改。"
  };
}

async function requestAgentWithConfig(config, message) {
  var url = String(config.url || "").trim();
  var model = String(config.model || "").trim();
  var key = String(config.key || "").trim();
  if (!url || !model || !key) {
    throw new Error("请先在 WebMeld 的 Agent 设置中填写 URL、模型名和 key。");
  }
  try {
    var parsedUrl = new URL(url);
    var loopback = parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "[::1]";
    if (parsedUrl.protocol !== "https:" && !(parsedUrl.protocol === "http:" && loopback)) {
      throw new Error("secure-agent-url");
    }
  } catch (error) {
    throw new Error("远程 Agent 必须使用 HTTPS；只有 localhost 可以使用 HTTP。");
  }
  var controller = new AbortController();
  var timeout = setTimeout(function () { controller.abort(); }, 30000);
  try {
    var response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + key
      },
      body: JSON.stringify({
        model: model,
        temperature: 0.15,
        messages: [
          {
            role: "system",
            content: [
              "You are WebMeld, a careful CSS editing assistant.",
              "Return JSON only, with this exact shape: {\"declarations\":[\"property: value;\"],\"reason\":\"short explanation\"}.",
              "Return declarations only, never a selector, <style> tag, JavaScript, url(), @import, or markdown.",
              "Respect the user's intent and preserve the target's existing layout unless asked to change it.",
              "For size changes, inspect the supplied computed style and use a concrete px value when possible.",
              "Write the reason in the language indicated by uiLanguage, or match the user's instruction when uiLanguage is absent."
            ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify(message)
          }
        ]
      }),
      signal: controller.signal
    });
    var rawBody = await response.text();
    var body = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch (error) {
      if (!response.ok) {
        throw new Error("Agent 请求失败（" + response.status + "）：服务没有返回 JSON。" );
      }
      throw new Error("Agent 返回的内容不是有效 JSON。请确认 URL 指向兼容的 Chat Completions 接口。" );
    }
    if (!response.ok) {
      var apiMessage = body && body.error && (body.error.message || body.error.code);
      if (response.status === 401 || response.status === 403) {
        throw new Error("Agent 请求失败（" + response.status + "）：key 无效或没有权限。" );
      }
      if (response.status === 404) {
        throw new Error("Agent 请求失败（404）：请检查 URL 是否是完整的 Chat Completions 地址。" );
      }
      throw new Error("Agent 请求失败（" + response.status + "）" + (apiMessage ? "：" + apiMessage : "。"));
    }
    return parseJsonPlan(extractMessageText(body));
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error("Agent 请求超时（30 秒）。" );
    }
    if (error && error.name === "TypeError") {
      throw new Error("无法连接 Agent：请检查网络、URL，以及接口是否允许扩展请求。" );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestAgent(message) {
  return requestAgentWithConfig(await readAgentConfig(), message);
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message || (message.type !== "WEBMELD_AGENT_REQUEST" && message.type !== "WEBMELD_AGENT_TEST")) return false;
  var request = message.type === "WEBMELD_AGENT_TEST"
    ? requestAgentWithConfig(message.config || {}, testContext())
    : requestAgent(message.context);
  request.then(function (plan) {
    sendResponse({ ok: true, plan: plan });
  }).catch(function (error) {
    sendResponse({ ok: false, error: error && error.message ? error.message : "Agent 请求失败。" });
  });
  return true;
});
