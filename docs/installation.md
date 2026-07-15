# Installation

Clousight is a Manifest V3 browser extension that monitors multi-cloud service
status locally. There is no backend, no account, and no telemetry — you install
it, enable the providers you care about, and it runs entirely in your browser.

The extension currently installs **from source**. Listings on the Chrome Web
Store and Edge Add-ons are planned but **not yet published**.

## Requirements

- **Node.js 18+** — needed to build the extension.
- A **Chromium-based browser**: Chrome, Edge, or Brave.
- **Git** — to clone the repository.

## Install from source

### 1. Clone and build

```bash
git clone https://github.com/clousight/clousight-monitor-extension.git
cd clousight-monitor-extension
npm install
npm run build:extension
```

The build produces a `dist/` folder — this is the unpacked extension you load
into the browser.

### 2. Load the unpacked extension

1. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `dist/` folder produced by the build.

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
   Cloud, Alibaba Cloud, Tencent Cloud are verified and enabled by default).
3. Optionally adjust the check interval and enable browser notifications.
4. Create one or more **subscription rules** so you get notified about the
   incidents that matter to you.

## Verified vs. experimental providers

| Provider | Status |
| --- | --- |
| AWS | Verified — works by default |
| Azure | Verified — works by default |
| Google Cloud | Verified — works by default |
| Alibaba Cloud | Verified — works by default |
| Tencent Cloud | Verified — works by default |
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
npm run build:extension
```

Then reload the extension from `chrome://extensions`.

## Uninstalling

Open `chrome://extensions`, find Clousight, and click **Remove**. All locally
stored data (settings, rules, notification history, and any LLM key) is removed
with the extension.
