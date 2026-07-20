# Clousight — agent instructions

Clousight is a **zero-backend** Manifest V3 browser extension that monitors public cloud-provider status feeds locally. There is **no server, no account, no telemetry**. Keep it that way.

## Hard rules

- **No backend.** Do not add remote API calls, auth, Supabase, or telemetry. The only permitted network requests are to cloud providers' public status feeds, and each must be covered by a `host_permissions` (or `optional_host_permissions`) entry in `public/manifest.json`.
- **Local storage only.** Settings, subscriptions, and any user data live in `chrome.storage`. A BYOK LLM key (if configured) stays local.
- **i18n everything.** All user-visible strings go through `vue-i18n` and must exist in every locale under `src/i18n/locales/`. English is the source of truth.
- **TypeScript strict**, Vue 3 Composition API (`<script setup lang="ts">`), Tailwind for styling.

## Build & checks

```bash
npm install
npm run build:chrome      # -> dist/ (Chromium: Chrome/Edge/Brave/…)
npm run build:firefox     # -> dist-firefox/ (Firefox)
npm run lint && npm run typecheck && npm test && npm run build
```

`build:extension` is an alias for `build:chrome`. One code base builds every
browser; `scripts/build-extension.js --target=<chrome|firefox>` only rewrites
the manifest `background` shape (service worker vs. module event page) and adds
Firefox's `browser_specific_settings.gecko`. Keep new browser APIs to the
standard WebExtension surface (`chrome.*`, which Firefox aliases) so both
targets stay buildable from one source.

CI runs lint · typecheck · test · build on Node 20 & 22. Keep all green.

## Git (commit / push / pull)

This repo stores **no git identity and no remote** — the local
`user.name`/`user.email` are left empty on purpose (so a plain `git` operation
that records an author fails, "Author identity unknown", instead of leaking a
personal/global identity), and there is **no persisted `origin`** in
`.git/config`.

Run **every** git operation through `scripts/git.sh`, which stamps the project
identity (`Clousight <clousight@users.noreply.github.com>`) **and** the `origin`
remote (`https://github.com/clousight/clousight-monitor-extension`) at run time
only, writing nothing to `.git/config`:

```bash
npm run commit -- -m "feat: ..."   # scripts/git.sh commit ...
npm run push                       # scripts/git.sh push  (origin injected at run time)
npm run pull                       # scripts/git.sh pull
npm run git -- <any git args>      # e.g. npm run git -- fetch
```

Override the identity with `CLOUSIGHT_GIT_NAME` / `CLOUSIGHT_GIT_EMAIL`, and the
remote with `CLOUSIGHT_GIT_REMOTE`, all as per-invocation env vars. Never run
`git commit`/`git push` directly, never write user.name/user.email into
`.git/config`, and never re-add a persisted `origin` (`git remote add origin …`).

**Commit messages must not contain AI-assistant attribution** (no
`Co-Authored-By: Claude`, "Generated with Claude", `🤖`, etc.). This is enforced
by the `scripts/hooks/commit-msg` hook, which `scripts/git.sh` activates via
`core.hooksPath` — offending lines are stripped automatically. Do not add them.

## Layout

- `src/background/` — MV3 service worker: fetch feeds, normalize, match rules, notify.
- `src/services/` — status/provider services.
- `src/pages/`, `src/components/`, `src/layouts/` — Vue UI.
- `src/stores/` — Pinia.
- `src/i18n/locales/` — 2 languages (English + Simplified Chinese).
- `public/manifest.json` — MV3 manifest & permissions.

See `CONTRIBUTING.md` for how to add a provider or a translation.
