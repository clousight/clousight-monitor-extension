# Contributing to Clousight

Thanks for your interest in improving Clousight! This project is a zero-backend, privacy-friendly browser extension, and it thrives on community contributions — especially **new provider integrations** and **translations**.

By participating you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- 🐛 **Report bugs** — open an issue with clear reproduction steps.
- 🌩️ **Add a cloud provider** — see [Adding a provider](#adding-a-provider) below (great first contribution).
- 🌍 **Translate** — improve the English or Simplified Chinese locale files under `src/i18n/locales/`.
- ✨ **Features & fixes** — check open issues or propose something new first via an issue.

## Development setup

Prerequisites: **Node.js 18+** (the repo targets the version in [`.nvmrc`](.nvmrc)) and a Chromium-based browser.

```bash
git clone https://github.com/clousight/clousight-monitor-extension.git
cd clousight-monitor-extension
npm install
npm run build:extension   # produces dist/
```

Load `dist/` as an unpacked extension (`chrome://extensions/` → Developer mode → Load unpacked). Use `npm run dev:ext` to rebuild on change.

## Before you open a pull request

Run the full local gate — CI runs the same checks (on Node 20 & 22) and will block otherwise:

```bash
npm run check   # lint + typecheck + test + build, in one go
```

Or individually: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
`npm run lint:fix` and `npm run format` auto-fix most style issues.

For user-facing changes, add a line under `[Unreleased]` in [CHANGELOG.md](CHANGELOG.md).

## Coding standards

- **TypeScript strict** — no `any` unless truly unavoidable (and commented).
- **Vue 3 Composition API** with `<script setup lang="ts">`.
- **Tailwind** for styling; follow the existing token/utility conventions.
- **i18n** — every user-visible string goes through `vue-i18n`; never hard-code copy. Add keys to **all** locale files (English is the source of truth; if you can't translate, copy the English value and note it in the PR so a translator can follow up).
- Keep the extension **backend-free** — no new remote API calls, telemetry, or auth. Provider status feeds are the only permitted network calls, and each must be covered by a host permission.

## Adding a provider

Provider definitions are declarative and live in `src/services/providers/registry.ts`.
To add one you generally:

1. Add an entry to the registry: `code`, `name`, official `statusPageUrl`, the `feedUrl`
   to fetch, the `parser` type, and the `origin` match pattern.
2. Pick or add a parser in `src/services/providers/parsers/`:
   - `rss` — RSS 2.0 / Atom feeds (e.g. AWS, Azure)
   - `statuspage` — Atlassian Statuspage `/api/v2/incidents.json`
   - `gcp` — Google Cloud `incidents.json`
   - a **bespoke JSON adapter** when the provider's status site is a SPA with an
     undocumented API (see `alibaba.ts` / `tencent.ts` for examples)
3. Add the provider's `origin` to `host_permissions` in `public/manifest.json`.
4. Add the display name / labels to the i18n locale files.
5. Add a unit test with a sample payload (see the existing `*.test.ts` in `parsers/`).
6. Verify incidents show up locally and link to the official status page.

Set `experimental: true` on the registry entry if you don't yet have a verified,
publicly reachable endpoint — experimental providers are skipped by default.
Open an issue first if you're unsure; we'll help.

## Branching & pull-request workflow

We follow [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow): `main`
is always releasable and protected — **nobody pushes to it directly**; every change lands via a
pull request that passes CI.

1. **Fork** the repo (external contributors) and create a short-lived branch off the latest `main`.
   Name it by type: `feat/…`, `fix/…`, `docs/…`, `chore/…`, `refactor/…`.
   ```bash
   git switch -c feat/short-description
   ```
2. Make your change and run the full gate locally (`npm run check`).
3. Push the branch and open a PR against `main`. CI (lint · typecheck · test · build on Node 20 & 22)
   must be green before it can merge.
4. Address review feedback by pushing more commits to the same branch.
5. A maintainer merges with **squash** (one PR = one commit on `main`) and deletes the branch.

## Commit & PR conventions

- Use clear, imperative commit messages. [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`…) are encouraged.
- Keep PRs focused; one logical change per PR.
- Fill out the PR template, link related issues, and include screenshots for UI changes.
- Describe any new network requests or permissions and why they're needed.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
