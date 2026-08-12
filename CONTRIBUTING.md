# Contributing to WebMeld

Thanks for helping make WebMeld smaller, safer, and more useful.

## Before opening an issue

- Search existing issues first.
- Reproduce bugs on a public or synthetic page when possible.
- Never paste API keys, private HTML, personal data, or authenticated page screenshots into an issue.
- For security concerns, follow [SECURITY.md](SECURITY.md).

## Local development

1. Fork and clone the repository.
2. Open `chrome://extensions`.
3. Enable Developer mode and load the repository as an unpacked extension.
4. After changing extension code, click Reload on the extension card and refresh the test page.
5. Run the checks:

```bash
npm run check
```

No production dependency or build step is required.

## Pull requests

Keep changes focused. A good pull request explains:

- the user problem;
- the chosen behavior and trade-offs;
- how the change was verified on a real page;
- whether it changes permissions, transmitted data, or stored data.

Any change that expands model output beyond constrained CSS declarations requires an explicit security design discussion first.

## Style

- Prefer plain browser APIs and readable ES2020-compatible JavaScript.
- Keep model output untrusted at every boundary.
- Preserve preview, verification, rollback, and local-first behavior.
- Avoid adding dependencies for behavior that is clear in a few lines of platform code.
