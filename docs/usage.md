# Usage

Clousight surfaces multi-cloud status in two places: a compact **toolbar popup**
for a quick glance, and a full **dashboard** for filtering, incident details,
notifications, and rules. This page walks through each surface.

## Toolbar popup

Click the Clousight icon in your browser toolbar to open the popup. It shows:

- The **worst current status** for each enabled provider.
- A **badge** with the count of degraded or outage services.
- A **refresh** button to re-check status on demand.
- An **Open dashboard** button that opens the full UI.

Use the popup for a fast "is anything on fire right now?" check.

## Dashboard

The dashboard is the main view. It includes:

- **Status summary counts** — operational, degraded, outage, and maintenance.
- **Filters** — narrow the view by provider, region, category, and status.
- **Incident table** — one row per incident. Each row has a **view details**
  link that opens the provider's official status page in a new tab.

## Providers page

A per-provider overview. Each provider card shows current counts and links:

- An **internal detail** link to the provider detail page.
- An **official status** link to the provider's own status site.

## Provider detail page

Focuses on a single provider's incidents, with a **region sub-filter** so you
can drill into just the regions you operate in.

## Notifications page

A local history of the notifications Clousight has raised. You can:

- **Mark notifications as read.**
- Click **AI brief** on an incident (only when an LLM is configured in
  Settings) to generate a short AI-written summary of that incident.

Notification history is stored locally in your browser.

## Subscriptions page

Subscription rules decide **what notifies you**. Each rule has:

| Field | Description |
| --- | --- |
| Name | A label for the rule |
| Providers | Which providers the rule applies to |
| Regions | Which regions to match |
| Service keywords | Match incidents mentioning these services |
| Minimum severity | `info`, `maintenance`, `minor`, `major`, or `critical` |
| Browser notification | Toggle a browser toast for matches |

You can create **up to 10 rules**.

When a newly-fetched incident matches a rule, Clousight shows a browser
notification and adds it to the Notifications page.

> **Important:** With **no rules**, nothing notifies you. The toolbar badge
> still reflects current issues, but you won't receive notifications until you
> create at least one rule.

## Settings

Configure the extension's behavior:

- **Language** — 9 options: auto, English, 简体中文, 繁體中文, Deutsch,
  Español, Français, 日本語, 한국어, Português (Brasil).
- **Check interval** — how often (in minutes) status is re-checked.
- **Check on startup** — re-check as soon as the browser launches.
- **Enabled providers** — turn providers on or off.
- **Browser notifications** — global on/off.
- **AI briefings (optional)** — bring your own OpenAI-compatible endpoint:
  base URL, model, and API key. The key is **stored locally only** and never
  synced.

## How checking works in the background

A periodic **alarm** (default: every 5 minutes) wakes the background service
worker, which re-fetches the status of your enabled providers, updates the
toolbar badge, and matches any new incidents against your subscription rules.

Clousight monitors **only while your browser is running**. It does not check or
notify when the browser is closed.
