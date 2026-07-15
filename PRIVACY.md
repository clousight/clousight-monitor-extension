# Privacy Policy

_Last updated: 2026-07-15_

Clousight is a browser extension that monitors public cloud-provider status feeds
locally. **It has no backend, no account, and collects no personal data.**

## What Clousight stores

All data stays in your browser, in the extension's `chrome.storage`:

- Your settings (language, theme, check interval, enabled providers, notification
  preferences).
- Your subscription rules (which incidents should notify you).
- A local history of notifications it has shown you.
- If you choose to enable AI briefings, the LLM API key/endpoint/model you enter —
  stored locally only, never synced.

Clousight does **not** collect, transmit, or sell any of this. There is no
analytics, tracking, telemetry, or remote logging.

## Network requests Clousight makes

- **Cloud provider status feeds** — to show status, Clousight fetches the public
  status feeds of the providers you enable (e.g. AWS, Azure, Google Cloud,
  Alibaba Cloud, Tencent Cloud). These requests go directly to each provider and
  contain no personal information.
- **Your LLM endpoint (optional)** — only if you configure an API key, and only
  when you click to generate a briefing, Clousight sends that incident's text to
  the endpoint you specified, using your key.

No requests are made to any Clousight-operated server, because there isn't one.

## Permissions

- `storage` — save your settings and notifications locally.
- `alarms` — schedule periodic status checks.
- `notifications` — show a browser notification when a matching incident appears.
- Host access to provider status domains — required to fetch their status feeds.
  Experimental providers are requested on demand only when you enable them.

## Contact

Questions? Open an issue at
https://github.com/clousight/clousight-monitor-extension/issues or use private
[security reporting](SECURITY.md) for sensitive matters.
