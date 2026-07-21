# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-07-21

### Added

- Zero-backend cloud status monitoring in the MV3 background worker (fetch →
  normalize → match → notify), with a declarative provider registry.
- Provider feeds: AWS & Azure (RSS), Google Cloud (JSON), Alibaba & Tencent
  (JSON APIs), and Cloudflare, DigitalOcean & Linode/Akamai (Statuspage).
  Huawei Cloud and Volcano Engine are experimental (opt-in, on-demand permission).
- Per-provider notification preferences stored locally in `chrome.storage`.
- Local notification history and browser notifications.
- Optional bring-your-own-key LLM incident briefings (key stored locally).
- "View official status" links out to each provider's status page.
- Bilingual UI (English and Simplified Chinese).
- Per-provider watch/enable toggle, with on-demand host permissions for
  experimental providers.
- Inline SVG icons and no remote fonts — the extension makes no third-party
  requests beyond the provider feeds you enable.

### Notes

- Initial open-source release. The extension has no account, no server, and
  collects no data. See [PRIVACY.md](PRIVACY.md).

[Unreleased]: https://github.com/clousight/clousight-monitor-extension/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/clousight/clousight-monitor-extension/releases/tag/v0.1.0
