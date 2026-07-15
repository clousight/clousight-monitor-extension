# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Zero-backend cloud status monitoring in the MV3 background worker (fetch →
  normalize → match → notify), with a declarative provider registry.
- Provider feeds: AWS & Azure (RSS), Google Cloud, Alibaba & Tencent (JSON APIs).
  Huawei Cloud and Volcano Engine are experimental (opt-in, on-demand permission).
- Local subscription rules and event matching stored in `chrome.storage`.
- Local notification history and browser notifications.
- Optional bring-your-own-key LLM incident briefings (key stored locally).
- "View official status" links out to each provider's status page.
- 9-language UI (en, zh-CN, zh-Hant, de, es, fr, ja, ko, pt-BR).
- Per-provider enable/disable, with on-demand host permissions for experimental
  providers.
- Inline SVG icons and no remote fonts — the extension makes no third-party
  requests beyond the provider feeds you enable.

### Notes

- Initial open-source release. The extension has no account, no server, and
  collects no data. See [PRIVACY.md](PRIVACY.md).

[Unreleased]: https://github.com/clousight/clousight-monitor-extension/commits/main
