# Clousight — 多云状态监控（浏览器插件）

[![CI](https://github.com/clousight/clousight-monitor-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/clousight/clousight-monitor-extension/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[English](README.md) · **简体中文** · [📖 在线文档](https://clousight.github.io/clousight-monitor-extension/zh/)

> 在浏览器工具栏直接盯住主流云厂商的健康状态 —— **无账号、无服务器、不收集数据。**

Clousight 是一个 Manifest V3 浏览器插件,持续关注全球主流云厂商的公开状态源,把事件以工具栏徽章和浏览器原生通知的形式呈现。一切都在你的浏览器本地运行;事件详情跳转到各厂商的官方状态页。

隶属于 **CloudNorth（云计算指北）** 开源工具family。

## 为什么用 Clousight

- **零后端** —— 无需登录、无需云账号、不向任何服务器上报。插件直接抓取各厂商的公开状态源。
- **隐私友好** —— 你的厂商选择、过滤条件、设置都存在 `chrome.storage`。除了你选择关注的厂商请求,没有任何数据离开你的机器。
- **本地配置** —— 挑选你关心的厂商、区域和服务;出问题时通过工具栏徽章和浏览器通知提醒你。
- **可选自带 Key 的 AI** —— 填入你自己的 LLM API Key,即可获得简短、通俗的事件简报。Key 只存本地。
- **开放可审计** —— MIT 协议,欢迎贡献。

## 支持的厂商

| 厂商 | 状态 | 数据源 |
| --- | --- | --- |
| Amazon Web Services | ✅ 可用 | 官方 RSS |
| Microsoft Azure | ✅ 可用 | 官方 RSS |
| Google Cloud | ✅ 可用 | `incidents.json` |
| 阿里云 | ✅ 可用 | 状态站 JSON API |
| 腾讯云 | ✅ 可用 | 状态站 JSON API |
| 华为云 | 🧪 实验性 | 暂无确认的公开端点（状态站疑似区域受限） |
| 火山引擎 | 🧪 实验性 | 暂无确认的公开端点 |

实验性厂商默认不抓取,是非常好的"新增厂商"贡献切入点 —— 只要找到一个公开可达的可用源即可。见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 安装

### 从源码安装（开发）

前置:**Node.js 18+** 与一个 Chromium 内核浏览器（Chrome、Edge、Brave…）。

```bash
git clone https://github.com/clousight/clousight-monitor-extension.git
cd clousight-monitor-extension
npm install
npm run build:extension
```

然后在浏览器加载:

1. 打开 `chrome://extensions/`
2. 打开 **开发者模式**
3. 点击 **加载已解压的扩展程序**,选择 `dist/` 目录

自动重建的开发循环:`npm run dev:ext`（改动时重建 `dist/`;在浏览器里重新加载插件即可生效）。

## 开发

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | Web UI 的 Vite 开发服务器（快速迭代页面/组件） |
| `npm run dev:ext` | 构建插件到 `dist/` 并监听变更 |
| `npm run build` | 类型检查 + 构建 |
| `npm run build:extension` | 完整插件构建（含构建后资源拷贝） |
| `npm run lint` | ESLint（不改文件） |
| `npm run lint:fix` | ESLint 自动修复 |
| `npm run format` | 对 `src/` 跑 Prettier |
| `npm run typecheck` | `vue-tsc --noEmit` |
| `npm test` | 单元测试（Vitest） |
| `npm run e2e` | 端到端测试（Playwright） |
| `npm run check` | 本地整体门禁:lint + typecheck + test + build |

### 技术栈

Vue 3（组合式 API）· TypeScript（strict）· Pinia · Vue Router · Tailwind CSS · vue-i18n · Vite · Manifest V3。

## 文档

完整文档（中英双语）见
**<https://clousight.github.io/clousight-monitor-extension/zh/>**:

- [安装](docs/zh/installation.md) · [使用](docs/zh/usage.md) · [最佳实践](docs/zh/best-practices.md) · [常见问题](docs/zh/faq.md)
- [架构原理](docs/zh/architecture.md) —— 抓取 → 匹配 → 通知的流程、厂商接入层、本地存储模型。

## 隐私

无账号、无服务器、不追踪。所有数据都留在你的浏览器里;唯一的网络请求是你启用的厂商状态源(以及可选的你自己的 LLM 端点)。见 [PRIVACY.md](PRIVACY.md)。

## 贡献

非常欢迎贡献 —— bug 反馈、新增厂商、翻译、功能。请从 [CONTRIBUTING.md](CONTRIBUTING.md) 和 [行为准则](CODE_OF_CONDUCT.md) 开始。

## 协议

[MIT](LICENSE) © Clousight Contributors
