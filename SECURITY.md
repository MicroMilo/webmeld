# Security Policy

## Supported versions

WebMeld is an early preview. Security fixes are applied to the latest version on the default branch.

## Reporting a vulnerability

Please do not publish an exploitable vulnerability, a real API key, or captured private webpage content in a public issue.

Until a private security contact is established, open a minimal GitHub issue stating that you have a security report and include no sensitive details. The maintainer will arrange a private channel. GitHub private vulnerability reporting will be enabled when the repository is published.

Useful reports include:

- a concise description of the boundary that can be bypassed;
- the affected WebMeld version;
- safe reproduction steps using a non-sensitive test page;
- expected and actual behavior;
- a suggested mitigation, if known.

## Security boundaries

The model is untrusted. WebMeld accepts CSS declarations only and rejects selectors, JavaScript, remote resources, imports, expressions, and other unsafe values. The browser extension—not the model—owns preview, verification, persistence, and rollback.

Agent credentials are stored in `chrome.storage.local`. Users should provide restricted keys and avoid using WebMeld on sensitive pages with providers they do not trust.
