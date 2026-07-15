# Architecture

Clousight is a **zero-backend** Manifest V3 browser extension. Everything —
fetching provider status, matching it against your rules, storing notifications —
runs locally in the extension. There is no server, no account, and no telemetry.

## High-level flow

```
                 chrome.alarms (every N min)
                          │
                          ▼
        ┌──────────────────────────────────┐
        │  background service worker         │
        │  (src/background/index.ts)         │
        │                                    │
        │  1. fetchStatusSummary()           │  ── HTTPS ──▶  provider status feeds
        │     → NormalizedEvent[]             │               (AWS RSS, Azure RSS,
        │  2. eventsToServiceStatuses()      │                GCP/Alibaba/Tencent JSON)
        │  3. update toolbar badge           │
        │  4. match events vs local rules    │
        │     → create local notifications   │
        └──────────────────────────────────┘
                          │
             chrome.storage.local / .sync
                          │
                          ▼
        ┌──────────────────────────────────┐
        │  Vue UI (popup / options pages)    │
        │  Dashboard · Providers · Detail ·  │
        │  Notifications · Subscriptions ·   │
        │  Settings                          │
        └──────────────────────────────────┘
```

## Provider ingestion (`src/services/providers/`)

Declarative and easy to extend — see [CONTRIBUTING.md](../CONTRIBUTING.md#adding-a-provider).

- `registry.ts` — one `ProviderDef` per provider (code, name, feed URL, parser
  type, official status-page URL, origin). `experimental: true` marks providers
  without a verified public feed; those are skipped by default.
- `parsers/` — turn a fetched feed into `NormalizedEvent[]`:
  - `rss.ts` — RSS 2.0 / Atom (AWS, Azure), via `fast-xml-parser` (the MV3 service
    worker has no `DOMParser`).
  - `statuspage.ts` — Atlassian Statuspage `/api/v2/incidents.json`.
  - `gcp.ts` — Google Cloud `incidents.json`.
  - `alibaba.ts`, `tencent.ts` — bespoke adapters for those vendors' undocumented
    status APIs (their sites are SPAs with no generic feed).
- `fetchSummary.ts` — fetches the selected providers in parallel, normalizes,
  dedupes (worst severity wins; ties → newest) and caps the result.
- `severity.ts`, `hash.ts`, `types.ts` — shared helpers (severity ranking,
  synchronous stable ids, shared types).

Failures are isolated: a provider that errors lands in the summary's `errors`
array and simply contributes no events.

## Local data (`chrome.storage`)

| Key | Store | Contents |
| --- | --- | --- |
| `settings` | sync | UI prefs, check interval, notification prefs (owned by `userStore`) |
| `subscriptions` | sync | Local filter rules (`src/services/subscriptions.ts`) |
| `notifications` | local | Notification history (`src/services/notifications.ts`) |
| `serviceStatus`, `lastUpdated` | local | Latest fetched status for the UI |
| `seenEventIds` | local | De-dupe set so incidents notify only once |
| `llmConfig` | local | Optional BYOK LLM key/endpoint/model (never synced) |

## Matching & notifications

`src/services/matcher.ts` (ported from the former server) checks each event
against each local subscription rule (provider / region / service / min-severity).
On a new match the background worker stores a notification and raises a
`chrome.notifications` toast. With no rules, nothing notifies — the badge still
reflects current issues.

## Optional AI briefings (`src/services/llm.ts`)

If the user configures an OpenAI-compatible API key in Settings, the Notifications
view can request a short incident brief. The request goes directly from the
extension to the user's configured endpoint; the key stays in `chrome.storage.local`.

## What there is *not*

No backend API, no database, no auth/OAuth, no Supabase, no telemetry. If you're
adding a feature, keep it that way — the only outbound requests are to provider
status feeds (covered by `host_permissions`) and, optionally, the user's own LLM
endpoint.
