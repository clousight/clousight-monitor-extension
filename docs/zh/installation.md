# 安装

云计算指北 是一款基于 Manifest V3 的浏览器扩展，在本地监控多云服务状态。它没有
后端、无需账号、也没有遥测——安装后，启用你关心的云厂商，它就完全在浏览器中运行。

该扩展目前**从源码安装**。Chrome 应用商店、Edge Add-ons 与 Firefox Add-ons
（AMO）的上架计划已在规划中，但**尚未发布**。

## 环境要求

- **Node.js 18+**——用于构建扩展。
- 一个**受支持的浏览器**——任意 Chromium 内核浏览器（Chrome、Edge、Brave、
  Opera、Vivaldi…）或 **Firefox**。
- **Git**——用于克隆仓库。

## 从源码安装

### 1. 克隆并安装

```bash
git clone https://github.com/clousight/clousight-monitor-extension.git
cd clousight-monitor-extension
npm install
```

### 2. 按浏览器构建

同一份代码可构建到所有浏览器——只有 manifest 的 `background` 结构（以及 Firefox
的附加组件 id）不同。选择对应的构建命令:

```bash
npm run build:chrome     # Chromium 系（Chrome/Edge/Brave/Opera/…）→ dist/
npm run build:firefox    # Firefox → dist-firefox/
```

`npm run build:extension` 保留为 `build:chrome` 的别名。每条命令都会生成一个可加载
到浏览器的**未打包扩展**目录。

### 3. 加载未打包的扩展

**Chromium 系浏览器:**

1. 打开 `chrome://extensions`（或 `edge://extensions`、`brave://extensions`）。
2. 开启右上角的**开发者模式**。
3. 点击**加载已解压的扩展程序**,选择 `dist/` 目录。

**Firefox:**

1. 打开 `about:debugging#/runtime/this-firefox`。
2. 点击**临时载入附加组件（Load Temporary Add-on）**。
3. 选择 `dist-firefox/manifest.json`。

> Firefox 重启后会卸载临时附加组件。若需持久安装,须通过
> [addons.mozilla.org](https://addons.mozilla.org) 打包并签名（`web-ext sign`）；
> 这属于分发环节,本地使用无需如此。

云计算指北 随即会出现在工具栏中。可将其固定，方便快速打开弹窗。

## 开发循环

如果你要修改扩展，可运行监听构建，让 `dist/` 在每次改动时自动重建：

```bash
npm run dev:ext
```

重建后，回到 `chrome://extensions` 并**重新加载** 云计算指北 扩展以应用改动。
浏览器不会自动重新加载未打包的扩展。

## 首次运行

1. 点击工具栏中的 云计算指北 图标打开弹窗。
2. 打开**设置**，选择你使用的云厂商（AWS、Azure、Google Cloud、Cloudflare、
   DigitalOcean、Linode、阿里云、腾讯云已通过验证并默认启用）。
3. 可选：调整检查间隔并启用浏览器通知。
4. 设置通知的**最低严重度**，即可就已启用厂商中你关心的事件收到通知。

## 已验证与实验性云厂商

| 云厂商 | 状态 |
| --- | --- |
| AWS | 已验证——默认可用 |
| Azure | 已验证——默认可用 |
| Google Cloud | 已验证——默认可用 |
| 阿里云 | 已验证——默认可用 |
| 腾讯云 | 已验证——默认可用 |
| Cloudflare | 已验证——默认可用 |
| DigitalOcean | 已验证——默认可用 |
| Linode (Akamai) | 已验证——默认可用 |
| 华为云 | 实验性——需手动启用 |
| 火山引擎 | 实验性——需手动启用 |

启用**实验性**云厂商会触发按需的主机权限请求。由于这些云厂商尚无已验证的公开
数据源，在有可用端点被贡献之前，它们可能不显示任何数据。

## 更新

更新从源码安装的副本：

```bash
git pull
npm install
npm run build:chrome     # 或:npm run build:firefox
```

然后从 `chrome://extensions` 重新加载扩展（Firefox 则从 `about:debugging` 重新加载）。

## 卸载

打开 `chrome://extensions`，找到 云计算指北，点击**移除**。所有本地存储的数据
（设置、规则、通知历史以及任何 LLM 密钥）都会随扩展一并删除。
