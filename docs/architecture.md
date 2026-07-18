# Architecture

Clousight is a **zero-backend** Manifest V3 (MV3) browser extension. Fetching
provider status, matching it against your rules, and storing notifications all
happen locally inside the extension. There is no server, no account, and no
telemetry.

## High-level flow

```
chrome.alarms (periodic, default 5 min)
        │
        ▼
background service worker
        │
        ├─ 1. fetch enabled providers' feeds in parallel
        ├─ 2. parse each feed into a common event shape
        ├─ 3. normalize, dedupe, and cap events
        ├─ 4. update the toolbar badge
        ├─ 5. write status to chrome.storage.local
        ├─ 6. keep new events at/above the min-severity threshold
        └─ 7. raise chrome.notifications + append to local history
        │
        ▼
Vue 3 + Pinia UI (popup + pages)
```

Each cycle:

1. `chrome.alarms` fires periodically.
2. The background service worker fetches the enabled providers' feeds **in
   parallel**.
3. Each provider has a **parser** that turns its feed into a common event
   shape.
4. Events are **normalized**, then **deduped** (worst severity wins; ties go to
   the newest) and **capped**.
5. The toolbar **badge** updates, and status is written to
   `chrome.storage.local`.
6. New events are **filtered** by the notification minimum-severity threshold
   (from your enabled providers).
7. Qualifying events raise `chrome.notifications` and are appended to the local
   notification history.

## Parsers

Each provider feed is turned into normalized events by a dedicated parser:

| Provider(s) | Feed type | Parser |
| --- | --- | --- |
| AWS, Azure | RSS | `fast-xml-parser` |
| Google Cloud | JSON | `incidents.json` parser |
| Statuspage-based | JSON | Atlassian Statuspage adapter |
| Alibaba Cloud | JSON | Bespoke adapter (undocumented API) |
| Tencent Cloud | JSON | Bespoke adapter (undocumented API) |

Alibaba and Tencent expose their status through undocumented JSON APIs (their
sites are SPAs with no generic feed), so they get bespoke adapters.

## Declarative provider registry

The provider registry is **declarative**. Each entry describes:

- Provider code and display name
- Feed URL
- Parser type
- Official status-page URL
- Origin (for host permissions)
- Experimental flag

Adding a provider is therefore a small, well-scoped task:

1. One registry entry.
2. A parser (or reuse an existing one).
3. A manifest origin.
4. i18n names.
5. A test.

## Storage layout

| Store | Contents |
| --- | --- |
| `chrome.storage.sync` | Settings (providers, theme, notification preferences) |
| `chrome.storage.local` | Latest status, notification history, seen-event-id set (for dedupe), optional LLM config |

Settings and rules live in **sync** storage so they follow the browser profile.
Everything operational — status, history, dedupe state, and the LLM key —
lives in **local** storage. The LLM key is never synced.

## Failure isolation

Failures are **isolated per provider**. If one provider errors, it simply
contributes no events for that cycle and is surfaced in an errors list. It
never crashes the whole run — the other providers still update.

## UI

The UI is **Vue 3 + Pinia**. The popup and pages read status from the
background worker (or, in development, fetch directly).

## MV3 constraints

The MV3 service worker imposes two notable constraints Clousight works around:

- **No `DOMParser`** in the service worker, so RSS is parsed with
  `fast-xml-parser` instead of the DOM.
- **No Node `crypto`**, so a small **synchronous hash** builds stable incident
  IDs for deduplication.

## What there is *not*

No backend API, no database, no auth/OAuth, no telemetry. The only outbound
requests are to provider status feeds (covered by host permissions) and,
optionally, the user's own LLM endpoint.
