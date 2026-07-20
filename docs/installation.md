# Installation

Clousight is a Manifest V3 browser extension that monitors multi-cloud service
status locally. There is no backend, no account, and no telemetry — you install
it, enable the providers you care about, and it runs entirely in your browser.

The extension currently installs **from source**. Listings on the Chrome Web
Store, Edge Add-ons, and Firefox Add-ons (AMO) are planned but **not yet
published**.

## Requirements

- **Node.js 18+** — needed to build the extension.
- A **supported browser** — any Chromium-based browser (Chrome, Edge, Brave,
  Opera, Vivaldi…) or **Firefox**.
- **Git** — to clone the repository.

## Install from source

### 1. Clone and install

```bash
git clone https://github.com/clousight/clousight-monitor-extension.git
cd clousight-monitor-extension
npm install
```

### 2. Build for your browser

The same code base builds for every browser — only the manifest's `background`
shape (and Firefox's add-on id) differ. Pick the matching build:

```bash
npm run build:chrome     # Chromium (Chrome/Edge/Brave/Opera/…) → dist/
npm run build:firefox    # Firefox → dist-firefox/
```

`npm run build:extension` is kept as an alias for `build:chrome`. Each command
produces an **unpacked extension** folder you load into the browser.

### 3. Load the unpacked extension

**Chromium browsers:**

1. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select the `dist/` folder.

**Firefox:**

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select `dist-firefox/manifest.json`.

> Firefox unloads temporary add-ons when it restarts. For a persistent install
> you must package and sign the add-on via [addons.mozilla.org](https://addons.mozilla.org)
> (`web-ext sign`); that is a distribution step, not required for local use.

Clousight now appears in your toolbar. Pin it for quick access to the popup.

## Development loop

If you want to modify the extension, run the watch build so `dist/` rebuilds
on every change:

```bash
npm run dev:ext
```

After a rebuild, return to `chrome://extensions` and **reload** the Clousight
extension to pick up the changes. The browser does not auto-reload unpacked
extensions.

## First run

1. Click the Clousight toolbar icon to open the popup.
2. Open **Settings** and choose the providers you use (AWS, Azure, Google
   Cloud, Cloudflare, DigitalOcean, Linode, Alibaba Cloud, and Tencent Cloud
   are verified and enabled by default).
3. Optionally adjust the check interval and enable browser notifications.
4. Set the **minimum severity** for notifications so you are alerted about the
   incidents that matter to you, for your enabled providers.

## Verified vs. experimental providers

| Provider | Status |
| --- | --- |
| AWS | Verified — works by default |
| Azure | Verified — works by default |
| Google Cloud | Verified — works by default |
| Alibaba Cloud | Verified — works by default |
| Tencent Cloud | Verified — works by default |
| Cloudflare | Verified — works by default |
| DigitalOcean | Verified — works by default |
| Linode (Akamai) | Verified — works by default |
| Huawei Cloud | Experimental — opt-in |
| Volcano Engine | Experimental — opt-in |

Enabling an **experimental** provider triggers an on-demand host-permission
request. Because these providers have no verified public feed yet, they may
show no data until a working endpoint is contributed.

## Updating

To update an installed-from-source copy:

```bash
git pull
npm install
npm run build:chrome     # or: npm run build:firefox
```

Then reload the extension from `chrome://extensions` (or, in Firefox, from
`about:debugging`).

## Uninstalling

Open `chrome://extensions`, find Clousight, and click **Remove**. All locally
stored data (settings, rules, notification history, and any LLM key) is removed
with the extension.
