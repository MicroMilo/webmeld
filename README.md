<div align="center">
  <img src="assets/brand/logo-mark.svg" width="92" alt="WebMeld logo">
  <h1>WebMeld</h1>
  <p><strong>Restyle any webpage with words.</strong><br>Select it. Describe it. Preview it safely. Keep it across visits.</p>
  <p>
    <img alt="Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&logoColor=white">
    <img alt="Zero dependencies" src="https://img.shields.io/badge/runtime_dependencies-0-2DA36D">
    <img alt="License MIT" src="https://img.shields.io/badge/license-MIT-7657F6">
  </p>
  <p>
    <a href="README.zh-CN.md">简体中文</a> ·
    <a href="#quick-start">Quick start</a> ·
    <a href="PRIVACY.md">Privacy</a> ·
    <a href="CONTRIBUTING.md">Contributing</a>
  </p>
</div>

![WebMeld configuring an Agent, selecting an element, and verifying a CSS preview](assets/demo/webmeld-demo.gif)

WebMeld is a lightweight Chromium extension for personalizing the web with natural language. Point at a real DOM element, describe the result you want, and WebMeld turns the request into a constrained CSS patch. Every patch is previewed against the live page, checked against its computed styles, and saved only after you approve it.

It works without Stylus, without an account, and without a WebMeld backend.

> [Watch the 1080p Agent setup and editing demo](assets/demo/webmeld-demo.mp4)

## Why WebMeld

| | |
|---|---|
| **Point, don't inspect** | Hover to reveal the exact element, selector, dimensions, and HTML context. |
| **Use plain language** | Ask for a larger title, calmer colors, a narrower reading column, or a hidden distraction. |
| **Bring your own model** | Connect any OpenAI-compatible Chat Completions endpoint with URL, model name, and key. |
| **Preview before writing** | Changes are rendered temporarily and accepted only after a real computed-style difference is detected. |
| **Fail safely** | Invalid, unsafe, ineffective, or directionally wrong CSS is rejected and removed automatically. |
| **Keep your web yours** | Approved rules live in local Chrome storage, survive refreshes, support undo, and export as UserCSS. |

## How it works

<p align="center">
  <img src="assets/demo/how-it-works.svg" width="1000" alt="WebMeld workflow: select, describe, verify, then save locally or roll back">
</p>

The model never receives permission to execute JavaScript or directly edit the DOM. It may only propose CSS declarations. WebMeld owns selector generation, sanitization, preview, verification, persistence, and rollback.

## Quick start

WebMeld is currently distributed as an unpacked extension while the Chrome Web Store release is prepared.

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome or another Chromium browser.
3. Enable **Developer mode**.
4. Click **Load unpacked** and choose this repository directory.
5. Open any `http://` or `https://` page and click the WebMeld toolbar icon.
6. Click **Select page element**, choose a target, describe the change, and preview it.

The keyboard shortcut is `Alt+Shift+M`.

### Try the included demo page

```bash
python3 -m http.server 8765
```

Then open <http://localhost:8765/demo-page.html>.

## Connect an Agent

WebMeld works out of the box with a small local rules engine. For open-ended requests, open **Agent settings** and provide:

- **URL** — a complete OpenAI-compatible `POST /chat/completions` endpoint;
- **Model** — the model identifier expected by your provider;
- **Key** — the corresponding bearer token.

Use **Test connection** before saving. Requests go directly from the extension service worker to the endpoint you enter; they do not pass through a WebMeld server.

When generating a suggestion, WebMeld sends the selected element's page URL and title, selector, short text and HTML excerpts, dimensions, selected computed styles, and your instruction. Review [PRIVACY.md](PRIVACY.md) before connecting a third-party model to sensitive pages.

## Safety model

WebMeld treats model output as untrusted input:

- accepts JSON with a bounded list of CSS declarations only;
- rejects selectors, style tags, JavaScript, `url()`, `@import`, expressions, and unsafe bindings;
- requires concrete pixel values for model-generated font-size changes;
- compares computed styles before and after preview;
- checks whether “larger” and “smaller” requests moved in the correct direction;
- rolls back when preview, apply, or local persistence fails.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the complete data flow and trust boundaries.

## Small on purpose

WebMeld's runtime is roughly 1,300 lines of plain JavaScript and CSS. There is no framework, bundler, production dependency, account system, or hosted service. That makes the extension quick to load and its security-sensitive behavior practical to audit.

```text
.
├── assets/                 Brand, icons, and demo media
├── docs/                   Architecture, brand, and product notes
├── scripts/                Validation and release packaging
├── background.js           Model client and service worker
├── content.js              Selection, UI, preview, verification, persistence
├── content.css             On-page selection overlay
├── demo-page.html          Local playground
└── manifest.json           Chromium extension manifest
```

## Development

No install step is required for the extension itself. Node.js is only used for repository checks and packaging.

```bash
npm run check
npm run package
```

The package command creates a review-ready ZIP under `dist/` and excludes repository-only files.

## Status and direction

WebMeld `0.1.1` is an early public preview. The core editing loop is complete: select → describe → preview → verify → apply → undo → persist.

The next exploration is not a larger pile of CSS commands. It is using this verified live-page editing layer to bridge design intent and production interfaces.

## Contributing

Bug reports, model compatibility notes, design ideas, and focused pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and please read [SECURITY.md](SECURITY.md) before reporting a vulnerability.

## License

[MIT](LICENSE) © 2026 MicroMilo
