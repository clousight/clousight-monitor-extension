# FAQ

## Does Clousight need an account or a server?

No. Clousight is a **zero-backend** extension. There is no account, no login,
no server, no telemetry, and no tracking. Everything runs locally in your
browser.

## What network requests does it make?

Only two kinds:

1. Requests to the **public status feeds** of the providers you enable.
2. Optionally, requests to **your own LLM endpoint** — but only if you
   configure one, and only when you click **AI brief**.

It never sends your data anywhere else.

## Where is my data stored?

All data — settings, subscription rules, notification history, and the optional
LLM key — is stored **locally** in `chrome.storage`. The LLM key is stored
locally and is **never synced**.

## Which providers are supported?

**Verified and working by default:** AWS, Azure, Google Cloud, Alibaba Cloud,
Tencent Cloud.

**Experimental (opt-in):** Huawei Cloud and Volcano Engine. These have no
verified public feed yet. Enabling one triggers an on-demand host-permission
request and may show no data until a working endpoint is contributed.

## Why am I not getting any notifications?

Clousight only notifies when a **subscription rule** matches a new incident.
With **no rules**, nothing notifies you — though the toolbar badge still
reflects current issues. Create at least one rule on the Subscriptions page.

Also check that:

- Browser notifications are enabled in Settings.
- The rule's minimum severity isn't set higher than the incidents you expect.
- The rule's providers, regions, and service keywords actually match.

## Can it alert me by email, SMS, or phone?

No. Clousight raises **browser notifications** only. It does not support email,
SMS, phone, or any server-side alerting. For guaranteed paging, use your
provider's own subscriptions and your on-call tooling.

## Does it work when my browser is closed?

No. Clousight monitors **only while the browser is running**. It does not check
status or notify when the browser is closed.

## How often does it check?

A periodic background alarm re-checks status, **every 5 minutes by default**.
You can change the check interval in Settings, and optionally enable a check on
browser startup.

## How many subscription rules can I create?

Up to **10**.

## What is an "AI brief"?

If you configure an OpenAI-compatible LLM endpoint in Settings, the
Notifications page shows an **AI brief** button on each incident that generates
a short summary. The request goes directly from the extension to your endpoint;
the key stays local.

## Is there team or multi-user support?

No. Clousight is single-user and local. There are no accounts, no team
features, and no data sync beyond the browser's own settings sync.

## How do I install it?

Currently from source: clone the repository, `npm install`, `npm run
build:extension`, then load the `dist/` folder as an unpacked extension. See
the [Installation](./installation.md) page. Chrome Web Store and Edge Add-ons
listings are planned but not yet published.

## How can I add a provider or a translation?

Both are welcome and reasonably easy. See `CONTRIBUTING.md` in the repository.
