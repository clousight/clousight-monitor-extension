# Store listing notes (Chrome Web Store / Edge Add-ons)

Reference material for publishing. Keep in sync with `public/manifest.json`.

## Single purpose

Clousight shows the operational status of major cloud providers and notifies the
user, locally, when an incident matches their rules. It does one thing: monitor
public cloud status feeds in the browser.

## Short description (≤132 chars)

> Watch AWS, Azure, GCP, Alibaba & Tencent Cloud status from your toolbar. No
> account, no server, no tracking.

## Detailed description (draft)

Clousight keeps an eye on the public status feeds of the major cloud providers
and surfaces incidents as a toolbar badge and browser notifications — all locally
in your browser.

- Zero backend: no sign-in, no cloud account, nothing phones home.
- Local rules: pick the providers, regions, and services you care about.
- Details link out to each provider's official status page.
- Optional, bring-your-own-key AI briefings (your key stays local).
- 9 languages. Open source (MIT).

## Permission justifications

| Permission | Why it's needed |
| --- | --- |
| `storage` | Persist settings, subscription rules, and notification history locally. |
| `alarms` | Run a periodic background status check. |
| `notifications` | Show a browser notification when a matching incident appears. |
| Host access to provider status domains (AWS, Azure, GCP, Alibaba, Tencent) | Fetch each provider's public status feed to determine current status. |
| Optional host access (Huawei, Volcano) | Requested only if the user enables these providers. |

## Data safety / privacy

- Does the extension collect user data? **No.**
- Is data sold or shared? **No.**
- All storage is local (`chrome.storage`); the only network calls are to the
  provider status feeds the user enables, plus the user's own LLM endpoint if
  configured. See [PRIVACY.md](../PRIVACY.md).

## Assets checklist (TODO before submission)

- [ ] 128×128 store icon (have `public/icons/icon128.png` — confirm it's final art)
- [ ] At least 1 screenshot 1280×800 or 640×400 (popup + dashboard)
- [ ] Small promo tile 440×280 (optional)
- [ ] Privacy policy URL (host PRIVACY.md or link to the repo file)
- [ ] Category: Developer Tools / Productivity
