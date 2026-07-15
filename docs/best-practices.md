# Best Practices

Clousight is a fast, local awareness tool. Getting the most out of it is mostly
about tuning your rules for signal over noise and understanding its limits.

## Reduce notification noise

The default state — no rules — means no notifications. When you do create
rules, keep them tight:

- **Raise the minimum severity.** Set a rule's minimum severity to `major` or
  `critical` so you're only alerted on real outages, not minor blips or
  informational updates.
- **Scope by provider, region, and service.** A rule that matches only your
  actual providers, the regions you run in, and the services you depend on
  will filter out incidents that don't affect you.
- **Use multiple focused rules** rather than one broad catch-all — for example,
  one `critical`-only rule spanning everything, plus a `major` rule scoped to
  your primary region.

## Enable only the providers you use

Turning off providers you don't use means:

- **Fewer network requests** on each check cycle.
- **Fewer permissions** — experimental providers request host permissions only
  when you enable them, so leaving them off keeps your permission footprint
  minimal.

## Understand the limits — this is not paging

Clousight monitors **only while the browser is running**. It is **not** a
replacement for server-side or on-call alerting (such as PagerDuty).

- Use Clousight as a **fast local awareness tool** for day-to-day visibility.
- For **guaranteed paging**, rely on each provider's own status subscriptions
  and your dedicated on-call tooling.

## Bring-your-own-key (BYOK) LLM

If you enable AI briefings:

- Use an API key that is **scoped or limited** to this use.
- The key is stored **locally only** in `chrome.storage.local` and is **never
  synced**.
- It is sent **only** to the endpoint you configure, and **only** when you
  click **AI brief** on a notification.

## Privacy

- Clousight **never phones home** — there is no backend, account, or telemetry.
- The only outbound requests are to the **status feeds of the providers you
  enable**, and (optionally) to **your own LLM endpoint**.
- Enable only the providers you need to keep your network activity minimal.

## Contributing

Adding a cloud provider or a translation is straightforward and a great way to
help. See `CONTRIBUTING.md` in the repository for step-by-step guidance.
