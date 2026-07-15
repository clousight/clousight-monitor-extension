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
npm run build:extension   # -> dist/ (load unpacked in the browser)
npm run lint && npm run typecheck && npm test && npm run build
```

CI runs lint · typecheck · test · build on Node 20 & 22. Keep all green.

## Git (commit / push / pull)

This repo stores **no git identity** — the local `user.name`/`user.email` are
left empty on purpose, so a plain `git` operation that records an author fails
("Author identity unknown") instead of leaking a personal/global identity.

Run **every** git operation through `scripts/git.sh`, which stamps the project
identity (`Clousight <clousight@users.noreply.github.com>`) at run time only,
writing nothing to `.git/config`:

```bash
npm run commit -- -m "feat: ..."   # scripts/git.sh commit ...
npm run push                       # scripts/git.sh push
npm run pull                       # scripts/git.sh pull
npm run git -- <any git args>      # e.g. npm run git -- push -u origin main
```

Override the identity with `CLOUSIGHT_GIT_NAME` / `CLOUSIGHT_GIT_EMAIL` env vars.
Never run `git commit`/`git push` directly, and never write user.name/user.email
into `.git/config`.

**Commit messages must not contain AI-assistant attribution** (no
`Co-Authored-By: Claude`, "Generated with Claude", `🤖`, etc.). This is enforced
by the `scripts/hooks/commit-msg` hook, which `scripts/git.sh` activates via
`core.hooksPath` — offending lines are stripped automatically. Do not add them.

## Layout

- `src/background/` — MV3 service worker: fetch feeds, normalize, match rules, notify.
- `src/services/` — status/provider services.
- `src/pages/`, `src/components/`, `src/layouts/` — Vue UI.
- `src/stores/` — Pinia.
- `src/i18n/locales/` — 9 languages.
- `public/manifest.json` — MV3 manifest & permissions.

See `CONTRIBUTING.md` for how to add a provider or a translation.
