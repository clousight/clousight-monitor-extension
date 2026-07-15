# Clousight — Multi-Cloud Status Monitor (Browser Extension)

[![CI](https://github.com/clousight/clousight-monitor-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/clousight/clousight-monitor-extension/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**English** · [简体中文](README.zh-CN.md) · [📖 Documentation](https://clousight.github.io/clousight-monitor-extension/)

> Watch the health of the major cloud providers straight from your browser toolbar — **no account, no server, no data collection.**

Clousight is a Manifest V3 browser extension that keeps an eye on the public status feeds of the world's major cloud providers and surfaces incidents as a toolbar badge and native browser notifications. Everything runs locally in your browser; incident details link out to each provider's official status page.

Also known by its Chinese name **云计算指北**.

## Why Clousight

- **Zero backend** — no sign-in, no cloud account, nothing phones home. The extension fetches public provider status feeds directly.
- **Privacy-friendly** — your provider selection, filters, and settings live in `chrome.storage`. Nothing leaves your machine except the requests to the providers you choose to watch.
- **Local configuration** — pick the providers, regions, and services you care about; get a toolbar badge and browser notifications when something breaks.
- **Bring-your-own-key AI (optional)** — plug in your own LLM API key to get short, plain-language incident briefings. The key stays local.
- **Open & auditable** — MIT licensed, contributions welcome.

## Supported providers

| Provider | Status | Source |
| --- | --- | --- |
| Amazon Web Services | ✅ Working | Official RSS feed |
| Microsoft Azure | ✅ Working | Official RSS feed |
| Google Cloud | ✅ Working | `incidents.json` |
| Alibaba Cloud | ✅ Working | Status-site JSON API |
| Tencent Cloud | ✅ Working | Status-site JSON API |
| Huawei Cloud | 🧪 Experimental | No confirmed public endpoint (status host is region-restricted) |
| Volcano Engine | 🧪 Experimental | No confirmed public endpoint |

Experimental providers are skipped by default and are a great "add a provider"
contribution — finding a working, publicly reachable feed is all that's needed.
See [CONTRIBUTING.md](CONTRIBUTING.md).

## Install

### From source (development)

Prerequisites: **Node.js 18+** and a Chromium-based browser (Chrome, Edge, Brave…).

```bash
git clone https://github.com/clousight/clousight-monitor-extension.git
cd clousight-monitor-extension
npm install
npm run build:extension
```

Then load it in your browser:

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` directory

For an auto-rebuilding dev loop: `npm run dev:ext` (rebuilds `dist/` on change; reload the extension in the browser to pick up changes).

## Development

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server for the web UI (fast iteration on pages/components) |
| `npm run dev:ext` | Build the extension into `dist/` and watch for changes |
| `npm run build` | Type-check and build |
| `npm run build:extension` | Full extension build (adds post-build asset copy) |
| `npm run lint` | ESLint (no changes) |
| `npm run lint:fix` | ESLint with autofix |
| `npm run format` | Prettier write over `src/` |
| `npm run typecheck` | `vue-tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run e2e` | End-to-end tests (Playwright) |
| `npm run check` | Full local gate: lint + typecheck + test + build |

### Tech stack

Vue 3 (Composition API) · TypeScript (strict) · Pinia · Vue Router · Tailwind CSS · vue-i18n · Vite · Manifest V3.

### Project layout

```
clousight-monitor-extension/
├── public/
│   ├── icons/            # Extension icons
│   └── manifest.json     # MV3 manifest
├── src/
│   ├── background/       # MV3 service worker (fetch, match, notify)
│   ├── components/       # Vue components
│   ├── layouts/          # Layout shells
│   ├── pages/            # Dashboard, Providers, Settings, …
│   ├── router/           # Vue Router
│   ├── services/         # Status, subscriptions, notifications, LLM
│   │   └── providers/    # Declarative provider registry + feed parsers
│   ├── stores/           # Pinia stores
│   ├── i18n/             # 9-language locale files
│   ├── types/            # Shared TypeScript types
│   └── utils/            # Helpers
├── scripts/              # Build & icon-generation scripts
└── tests/                # Playwright E2E
```

## Roadmap

- [x] Port provider status ingestion into the extension background worker (local, zero-backend fetch + normalization)
- [x] Local subscription rules + event matching in `chrome.storage`
- [x] Remove all remote-API / auth dependencies
- [x] Bring-your-own-key LLM incident briefings
- [x] On-demand host permissions for experimental providers
- [ ] Verified feeds for Huawei Cloud & Volcano Engine
- [ ] Chrome Web Store & Edge Add-ons listings

## Privacy

No account, no server, no tracking. All data stays in your browser; the only
network requests are to the provider status feeds you enable (and, optionally,
your own LLM endpoint). See [PRIVACY.md](PRIVACY.md).

## Documentation

Full docs (English + 简体中文) are at
**<https://clousight.github.io/clousight-monitor-extension/>**:

- [Installation](docs/installation.md) · [Usage](docs/usage.md) · [Best Practices](docs/best-practices.md) · [FAQ](docs/faq.md)
- [Architecture](docs/architecture.md) — the fetch → match → notify flow, provider ingestion, and local storage model.

## Contributing

Contributions are very welcome — bug reports, provider additions, translations, and features. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE) © Clousight Contributors
