# WebMeld Privacy Policy

Last updated: August 12, 2026

WebMeld is a local-first browser extension. It has no WebMeld-operated account system, analytics service, advertising system, or hosted model proxy.

## Data handled by the extension

WebMeld can access the webpage open in your browser because this access is required to let you select an element, preview CSS, and restore rules you previously approved.

The extension handles the following data:

- the current page URL and title;
- the selector, short text excerpt, short HTML excerpt, dimensions, and selected computed styles of the element you explicitly select;
- the natural-language instruction you enter;
- CSS rules you approve;
- the Agent endpoint URL, model name, and API key you configure.

## Local storage

Approved CSS rules and Agent settings are stored in `chrome.storage.local` on your device. The API key is stored as extension-local data; it is not protected by a separate WebMeld encryption or password layer. Do not reuse a highly privileged key. Prefer a restricted key with spending and model limits where your provider supports them.

WebMeld does not upload this local storage to a WebMeld server.

## Third-party model requests

WebMeld includes a small local rules engine that does not make network requests. If you configure an Agent and generate a suggestion, the extension sends the selected page context and your instruction directly to the endpoint you provided. The API key is sent in the `Authorization` header for that request.

That provider processes the request under its own terms and privacy policy. Do not use a third-party model on pages containing sensitive information unless you understand and accept the provider's data practices.

WebMeld requires HTTPS for remote Agent endpoints. Plain HTTP is accepted only for loopback development endpoints such as `localhost` and `127.0.0.1`.

## Data sharing and sale

The WebMeld project does not sell personal data, use browsing activity for advertising, or allow humans to inspect page content transmitted through the extension. Data is sent only to the model endpoint the user explicitly configures and only when the user asks WebMeld to generate a suggestion.

## Retention and deletion

Locally saved rules and Agent settings remain until you remove them or uninstall the extension. You can remove all extension data from Chrome's extension settings. Uninstalling WebMeld also removes its local extension storage according to Chrome's behavior.

## Permissions

- `storage` stores approved rules and Agent settings locally.
- `activeTab` supports user-invoked interaction with the active page.
- Website access is required to display the selector overlay, inspect the user-selected element, apply previews, and restore approved rules.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the implementation's trust boundaries.

## Changes

Material changes to this policy will be documented in the repository and reflected by the “Last updated” date above.

## Contact

For privacy questions, open a repository issue without including private page content, credentials, or API keys.

---

## 中文摘要

WebMeld 采用本地优先设计，没有 WebMeld 运营的账号、分析、广告或模型中转服务。确认后的 CSS 规则与 Agent 配置保存在当前浏览器的 `chrome.storage.local` 中。

未配置 Agent 时，本地规则不会发起网络请求。配置 Agent 后，只有在用户主动生成修改建议时，WebMeld 才会把当前页面 URL、标题、所选元素的短文本和 HTML 摘要、尺寸、部分计算样式及用户指令直接发送到用户填写的模型地址。数据不会经过 WebMeld 服务器，但会受对应模型服务商的条款和隐私政策约束。

Key 作为扩展本地数据保存，没有额外的 WebMeld 加密或密码保护。建议使用权限和额度受限的专用 Key。远程 Agent 地址必须使用 HTTPS；仅本机开发地址允许 HTTP。
