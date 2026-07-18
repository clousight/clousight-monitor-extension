# Clousight「云计算指北」视觉重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Clousight 的 Popup、仪表盘、云厂商页、设置页和品牌资产统一为默认浅色、可切换深色的「云计算指北」视觉系统，并移除“模拟数据”等错误表述。

**Architecture:** 保持现有 Vue 3 + Pinia + MV3 数据链路不变，在 UI 边界新增纯函数状态聚合、品牌组件和状态徽标。Popup 与全页应用共享 provider registry、状态摘要、主题设置和 Manifest 版本，页面只负责展示与交互。

**Tech Stack:** Vue 3 Composition API、TypeScript strict、Pinia、vue-i18n、Tailwind CSS、Vitest + jsdom、Vue Test Utils、Playwright、Manifest V3。

## Global Constraints

- 不新增后端、账号、Supabase、远程业务 API 或遥测。
- 网络请求仅访问 Manifest 已授权的云厂商公开状态源。
- 所有新增用户可见文案同时写入 `src/i18n/locales/en.json` 与 `src/i18n/locales/zh-CN.json`。
- 中文品牌固定为“云计算指北”，英文品牌为“Clousight”。
- Popup 和全页界面默认浅色，并共享 `light | dark | system` 设置。
- Popup 不加载远程字体或图标字体；图标继续使用本地 SVG/PNG。
- 状态必须同时使用颜色和文字，触控目标约 44×44px，并保留可见键盘焦点。
- 使用 `slate-*` 中性色和 `primary/success/warning/danger` 语义色，不新增散落的裸十六进制颜色。
- 不覆盖当前工作区已有改动。每次提交只显式暂存本任务文件，并通过 `npm run git -- ...` / `npm run commit -- ...` 执行 Git 操作。
- `src/pages/Settings.vue` 当前已有未提交的语言精简改动；执行相关任务时必须在现有内容上追加主题与版本 UI，不得恢复已删除语言。

---

## File Map

### New files

- `src/utils/providerDisplay.ts`：provider code → registry 友好名称和稳定 ID。
- `src/utils/providerDisplay.test.ts`：名称映射、大小写和未知 provider 测试。
- `src/utils/statusSummary.ts`：按厂商聚合服务状态并计算整体健康度。
- `src/utils/statusSummary.test.ts`：严重度、计数、排序和空输入测试。
- `src/utils/extensionMeta.ts`：从 Manifest 读取版本。
- `src/utils/extensionMeta.test.ts`：扩展环境和开发环境测试。
- `src/utils/themeBootstrap.ts`：读取已保存主题并在 Vue mount 前应用 `html.dark`。
- `src/utils/themeBootstrap.test.ts`：浅色、深色、system 和 class 切换测试。
- `src/components/StatusBadge.vue`：统一状态徽标。
- `src/components/StatusBadge.test.ts`：四种状态、未知状态和 aria 测试。
- `src/components/AppBrand.vue`：统一 Logo、品牌名和可选副标题。
- `src/components/AppBrand.test.ts`：中英文品牌和尺寸测试。
- `src/PopupApp.test.ts`：Popup 概览、友好厂商名、空态、错误态和真实数据来源测试。

### Modified files

- `src/main.ts`、`src/popup-main.ts`：Vue mount 前执行主题 bootstrap。
- `src/stores/userStore.ts`：共享主题类型并监听系统主题变化。
- `src/PopupApp.vue`、`popup.html`：方案 A Popup。
- `src/layouts/DefaultLayout.vue`、`src/components/AppNavigation.vue`：统一应用壳与导航。
- `src/pages/Dashboard.vue`、`src/pages/Providers.vue`、`src/pages/ProviderDetail.vue`：友好名称、状态徽标和异常优先层级。
- `src/pages/Settings.vue`：主题选择、动态版本、品牌 About。
- `src/i18n/locales/en.json`、`src/i18n/locales/zh-CN.json`：新文案并删除 mock 表述。
- `options.html`：删除不存在的 `css/options.css`。
- `tests/e2e/extension-smoke.spec.ts`：品牌、主题和错误文案回归。

### Deleted files

- `public/css/popup.css`：未引用的旧样式。
- `src/popup.html`：错误指向全页入口的过时副本。

---

### Task 1: Provider 名称、状态摘要和动态版本纯函数

**Files:**
- Create: `src/utils/providerDisplay.ts`
- Create: `src/utils/providerDisplay.test.ts`
- Create: `src/utils/statusSummary.ts`
- Create: `src/utils/statusSummary.test.ts`
- Create: `src/utils/extensionMeta.ts`
- Create: `src/utils/extensionMeta.test.ts`
- Read only: `src/services/providers/registry.ts`
- Read only: `src/types/status.ts`

**Interfaces:**
- Produces: `getProviderDisplayName(code: string): string`
- Produces: `getProviderId(code: string): string`
- Produces: `ProviderSummary`
- Produces: `deriveProviderSummaries(services: ServiceStatus[]): ProviderSummary[]`
- Produces: `OverallHealth`
- Produces: `deriveOverallHealth(summaries: ProviderSummary[]): OverallHealth`
- Produces: `getExtensionVersion(): string`

- [ ] **Step 1: Write provider display tests**

```ts
import { describe, expect, it } from 'vitest';
import { getProviderDisplayName, getProviderId } from './providerDisplay';

describe('providerDisplay', () => {
  it('uses the registry friendly name case-insensitively', () => {
    expect(getProviderDisplayName('aws')).toBe('Amazon Web Services');
    expect(getProviderDisplayName('ALIBABA')).toBe('Alibaba Cloud');
  });

  it('keeps an unknown provider readable', () => {
    expect(getProviderDisplayName('custom-cloud')).toBe('custom-cloud');
  });

  it('normalizes ids without changing the registry code', () => {
    expect(getProviderId('Google Cloud')).toBe('google-cloud');
    expect(getProviderId('AWS')).toBe('aws');
  });
});
```

- [ ] **Step 2: Run provider tests and verify failure**

Run: `npm test -- src/utils/providerDisplay.test.ts`  
Expected: FAIL because `./providerDisplay` does not exist.

- [ ] **Step 3: Implement provider display helpers**

```ts
import { getProvider } from '@/services/providers/registry';

export function getProviderDisplayName(code: string): string {
  return getProvider(code)?.name ?? code;
}

export function getProviderId(code: string): string {
  return code.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
```

- [ ] **Step 4: Write status aggregation tests**

```ts
import { describe, expect, it } from 'vitest';
import type { ServiceStatus, StatusType } from '@/types/status';
import { deriveOverallHealth, deriveProviderSummaries } from './statusSummary';

function service(provider: string, status: StatusType, region = 'global'): ServiceStatus {
  return {
    id: `${provider}-${status}-${region}`,
    provider,
    serviceId: 'service',
    serviceName: 'Service',
    region,
    status,
    updatedAt: 1
  };
}

describe('statusSummary', () => {
  it('aggregates each provider and keeps the worst status', () => {
    const rows = deriveProviderSummaries([
      service('AWS', 'operational', 'us-east-1'),
      service('AWS', 'degraded', 'eu-west-1'),
      service('GCP', 'maintenance')
    ]);
    expect(rows[0]).toMatchObject({
      code: 'AWS',
      name: 'Amazon Web Services',
      worst: 'degraded',
      total: 2,
      regions: 2
    });
    expect(rows[1]).toMatchObject({ code: 'GCP', worst: 'maintenance' });
  });

  it('sorts incidents before operational providers', () => {
    const rows = deriveProviderSummaries([
      service('AWS', 'operational'),
      service('GCP', 'outage'),
      service('AZURE', 'degraded')
    ]);
    expect(rows.map(row => row.code)).toEqual(['GCP', 'AZURE', 'AWS']);
  });

  it('derives provider-level overall health', () => {
    const health = deriveOverallHealth(
      deriveProviderSummaries([
        service('AWS', 'operational'),
        service('GCP', 'outage'),
        service('AZURE', 'operational')
      ])
    );
    expect(health).toEqual({
      total: 3,
      operational: 2,
      degraded: 0,
      outage: 1,
      maintenance: 0,
      affected: 1,
      worst: 'outage'
    });
  });

  it('returns a neutral empty summary', () => {
    expect(deriveOverallHealth([])).toEqual({
      total: 0,
      operational: 0,
      degraded: 0,
      outage: 0,
      maintenance: 0,
      affected: 0,
      worst: null
    });
  });
});
```

- [ ] **Step 5: Run aggregation tests and verify failure**

Run: `npm test -- src/utils/statusSummary.test.ts`  
Expected: FAIL because `./statusSummary` does not exist.

- [ ] **Step 6: Implement aggregation**

```ts
import { getProvider } from '@/services/providers/registry';
import type { ServiceStatus, StatusType } from '@/types/status';
import { getProviderDisplayName, getProviderId } from './providerDisplay';

export interface ProviderSummary {
  id: string;
  code: string;
  name: string;
  worst: StatusType;
  total: number;
  regions: number;
  counts: Record<StatusType, number>;
  statusPageUrl?: string;
}

export interface OverallHealth {
  total: number;
  operational: number;
  degraded: number;
  outage: number;
  maintenance: number;
  affected: number;
  worst: StatusType | null;
}

const severity: Record<StatusType, number> = {
  outage: 4,
  degraded: 3,
  maintenance: 2,
  operational: 1
};

export function deriveProviderSummaries(services: ServiceStatus[]): ProviderSummary[] {
  const grouped = new Map<string, ProviderSummary & { regionSet: Set<string> }>();
  for (const service of services) {
    const code = service.provider.toUpperCase();
    const current = grouped.get(code) ?? {
      id: getProviderId(code),
      code,
      name: getProviderDisplayName(code),
      worst: 'operational',
      total: 0,
      regions: 0,
      counts: { operational: 0, degraded: 0, outage: 0, maintenance: 0 },
      statusPageUrl: getProvider(code)?.statusPageUrl,
      regionSet: new Set<string>()
    };
    current.total += 1;
    current.counts[service.status] += 1;
    current.regionSet.add(service.regionId || service.region);
    if (severity[service.status] > severity[current.worst]) current.worst = service.status;
    grouped.set(code, current);
  }
  return [...grouped.values()]
    .map(({ regionSet, ...summary }) => ({ ...summary, regions: regionSet.size }))
    .sort((a, b) => severity[b.worst] - severity[a.worst] || a.name.localeCompare(b.name));
}

export function deriveOverallHealth(summaries: ProviderSummary[]): OverallHealth {
  const result: OverallHealth = {
    total: summaries.length,
    operational: 0,
    degraded: 0,
    outage: 0,
    maintenance: 0,
    affected: 0,
    worst: null
  };
  for (const summary of summaries) {
    result[summary.worst] += 1;
    if (summary.worst !== 'operational') result.affected += 1;
    if (result.worst === null || severity[summary.worst] > severity[result.worst]) {
      result.worst = summary.worst;
    }
  }
  return result;
}
```

- [ ] **Step 7: Write and implement dynamic version tests**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getExtensionVersion } from './extensionMeta';

describe('getExtensionVersion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads the manifest version in extension pages', () => {
    vi.stubGlobal('chrome', { runtime: { getManifest: () => ({ version: '2.3.4' }) } });
    expect(getExtensionVersion()).toBe('2.3.4');
  });

  it('uses a development label outside the extension', () => {
    vi.stubGlobal('chrome', undefined);
    expect(getExtensionVersion()).toBe('dev');
  });
});
```

```ts
export function getExtensionVersion(): string {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
    return chrome.runtime.getManifest().version;
  }
  return 'dev';
}
```

- [ ] **Step 8: Run Task 1 checks**

Run: `npm test -- src/utils/providerDisplay.test.ts src/utils/statusSummary.test.ts src/utils/extensionMeta.test.ts && npm run typecheck`  
Expected: all tests PASS and typecheck exits 0.

- [ ] **Step 9: Commit Task 1**

```bash
npm run git -- add src/utils/providerDisplay.ts src/utils/providerDisplay.test.ts src/utils/statusSummary.ts src/utils/statusSummary.test.ts src/utils/extensionMeta.ts src/utils/extensionMeta.test.ts
npm run commit -- -m "feat: add shared cloud status presentation helpers"
```

---

### Task 2: Shared theme bootstrap and system theme synchronization

**Files:**
- Create: `src/utils/themeBootstrap.ts`
- Create: `src/utils/themeBootstrap.test.ts`
- Modify: `src/main.ts`
- Modify: `src/popup-main.ts`
- Modify: `src/stores/userStore.ts`
- Modify: `popup.html`

**Interfaces:**
- Produces: `ThemePreference = 'light' | 'dark' | 'system'`
- Produces: `resolveTheme(theme, prefersDark): 'light' | 'dark'`
- Produces: `applyThemeClass(theme): void`
- Produces: `loadStoredTheme(): Promise<ThemePreference>`
- Produces: `bootstrapTheme(): Promise<void>`

- [ ] **Step 1: Write failing theme tests**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyThemeClass, loadStoredTheme, resolveTheme } from './themeBootstrap';

describe('themeBootstrap', () => {
  afterEach(() => {
    document.documentElement.className = '';
    vi.unstubAllGlobals();
  });

  it('resolves explicit and system themes', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('system', true)).toBe('dark');
  });

  it('applies the root class and color scheme', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    applyThemeClass('system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('reads the same settings object used by userStore', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        sync: {
          get: (_keys: string[], callback: (data: unknown) => void) =>
            callback({ settings: { theme: 'dark' } })
        }
      }
    });
    await expect(loadStoredTheme()).resolves.toBe('dark');
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run: `npm test -- src/utils/themeBootstrap.test.ts`  
Expected: FAIL because `./themeBootstrap` does not exist.

- [ ] **Step 3: Implement the theme bootstrap**

```ts
export type ThemePreference = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

export function resolveTheme(theme: ThemePreference, prefersDark: boolean): EffectiveTheme {
  return theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
}

export function applyThemeClass(theme: ThemePreference): void {
  const prefersDark =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  const effective = resolveTheme(theme, prefersDark);
  document.documentElement.classList.toggle('dark', effective === 'dark');
  document.documentElement.style.colorScheme = effective;
}

export async function loadStoredTheme(): Promise<ThemePreference> {
  if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
    return new Promise(resolve => {
      chrome.storage.sync.get(['settings'], data => {
        const theme = data.settings?.theme;
        resolve(theme === 'dark' || theme === 'system' ? theme : 'light');
      });
    });
  }
  try {
    const theme = JSON.parse(localStorage.getItem('settings') ?? '{}').theme;
    return theme === 'dark' || theme === 'system' ? theme : 'light';
  } catch {
    return 'light';
  }
}

export async function bootstrapTheme(): Promise<void> {
  applyThemeClass(await loadStoredTheme());
}
```

- [ ] **Step 4: Apply theme before both Vue mounts**

Update `src/main.ts` and `src/popup-main.ts` so the first action inside `bootstrap()` is:

```ts
import { bootstrapTheme } from './utils/themeBootstrap';

async function bootstrap(): Promise<void> {
  await bootstrapTheme();
  // existing createApp / Pinia / i18n initialization follows unchanged
}
```

Update `popup.html` body to:

```html
<body
  class="m-0 bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100"
  style="margin: 0; width: 360px; min-width: 360px"
>
```

- [ ] **Step 5: Make userStore reuse the theme helpers and watch system changes**

In `src/stores/userStore.ts`:

```ts
import {
  applyThemeClass,
  resolveTheme,
  type ThemePreference
} from '@/utils/themeBootstrap';

interface UserSettings {
  localePreference: LocalePreference;
  theme: ThemePreference;
  // retain every existing setting field unchanged
}

const systemThemeMedia =
  typeof matchMedia === 'undefined' ? null : matchMedia('(prefers-color-scheme: dark)');

// getter body
effectiveTheme: (state): 'light' | 'dark' =>
  resolveTheme(state.settings.theme, systemThemeMedia?.matches ?? false)

// actions
applyTheme() {
  applyThemeClass(this.settings.theme);
},

startSystemThemeSync() {
  systemThemeMedia?.addEventListener('change', this.applyTheme);
},

stopSystemThemeSync() {
  systemThemeMedia?.removeEventListener('change', this.applyTheme);
},

setTheme(theme: ThemePreference) {
  this.settings.theme = theme;
  this.applyTheme();
  void this.saveSettings();
}
```

Call `this.startSystemThemeSync()` once from `initialize()` after `applyTheme()`.

- [ ] **Step 6: Run Task 2 checks**

Run: `npm test -- src/utils/themeBootstrap.test.ts && npm run typecheck && npm run build:chrome`  
Expected: test PASS, typecheck exits 0, Chrome build succeeds.

- [ ] **Step 7: Commit Task 2**

```bash
npm run git -- add src/utils/themeBootstrap.ts src/utils/themeBootstrap.test.ts src/main.ts src/popup-main.ts src/stores/userStore.ts popup.html
npm run commit -- -m "feat: synchronize extension theme before render"
```

---

### Task 3: Shared brand and status components

**Files:**
- Create: `src/components/AppBrand.vue`
- Create: `src/components/AppBrand.test.ts`
- Create: `src/components/StatusBadge.vue`
- Create: `src/components/StatusBadge.test.ts`
- Modify: `src/layouts/DefaultLayout.vue`
- Verify: `public/images/logo.svg`
- Verify: `public/icons/icon.svg`

**Interfaces:**
- Produces: `<AppBrand compact?: boolean subtitle?: string />`
- Produces: `<StatusBadge status: StatusType | 'unknown' label?: string />`

- [ ] **Step 1: Write failing component tests**

```ts
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { describe, expect, it } from 'vitest';
import StatusBadge from './StatusBadge.vue';

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: {
    'zh-CN': {
      status: { short: { operational: '正常', degraded: '服务降级', outage: '故障',
        maintenance: '维护中', unknown: '未知' } }
    }
  }
});

describe('StatusBadge', () => {
  it.each([
    ['operational', '正常'],
    ['degraded', '服务降级'],
    ['outage', '故障'],
    ['maintenance', '维护中'],
    ['unknown', '未知']
  ])('renders %s with text and an accessible status', (status, label) => {
    const wrapper = mount(StatusBadge, {
      props: { status },
      global: { plugins: [i18n] }
    });
    expect(wrapper.text()).toBe(label);
    expect(wrapper.attributes('role')).toBe('status');
    expect(wrapper.classes()).toContain(`status-${status}`);
  });
});
```

```ts
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { describe, expect, it } from 'vitest';
import AppBrand from './AppBrand.vue';

describe('AppBrand', () => {
  it('uses the shared logo and localized brand', () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'zh-CN',
      messages: { 'zh-CN': { app: { brand: '云计算指北' } } }
    });
    const wrapper = mount(AppBrand, {
      props: { subtitle: '多云服务健康状态' },
      global: { plugins: [i18n] }
    });
    expect(wrapper.get('img').attributes('src')).toBe('/images/logo.svg');
    expect(wrapper.text()).toContain('云计算指北');
    expect(wrapper.text()).toContain('多云服务健康状态');
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/components/StatusBadge.test.ts src/components/AppBrand.test.ts`  
Expected: FAIL because both components do not exist.

- [ ] **Step 3: Implement `StatusBadge.vue`**

```vue
<template>
  <span
    role="status"
    :aria-label="resolvedLabel"
    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
    :class="`status-${status}`"
  >
    <span class="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true"></span>
    {{ resolvedLabel }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { StatusType } from '@/types/status';

const props = defineProps<{ status: StatusType | 'unknown'; label?: string }>();
const { t } = useI18n();
const resolvedLabel = computed(() => props.label ?? t(`status.short.${props.status}`));
</script>

<style scoped>
.status-operational { @apply bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300; }
.status-degraded { @apply bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-200; }
.status-outage { @apply bg-danger-50 text-danger-700 dark:bg-danger-900/30 dark:text-danger-200; }
.status-maintenance { @apply bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200; }
.status-unknown { @apply bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300; }
</style>
```

- [ ] **Step 4: Implement `AppBrand.vue`**

```vue
<template>
  <div class="flex min-w-0 items-center gap-2.5">
    <img
      src="/images/logo.svg"
      alt=""
      class="shrink-0"
      :class="compact ? 'h-8 w-8' : 'h-10 w-10'"
    />
    <div class="min-w-0">
      <div class="truncate font-semibold text-slate-900 dark:text-white">{{ t('app.brand') }}</div>
      <div v-if="subtitle" class="truncate text-xs text-slate-500 dark:text-slate-400">
        {{ subtitle }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
withDefaults(defineProps<{ compact?: boolean; subtitle?: string }>(), { compact: false });
const { t } = useI18n();
</script>
```

- [ ] **Step 5: Replace the duplicated sidebar brand**

In `src/layouts/DefaultLayout.vue`, replace `.app-logo` markup with:

```vue
<AppBrand compact />
```

Import `AppBrand` and delete `.app-logo`, `.logo-image`, `.logo-text` rules. Preserve the mobile toggle and hide only the brand text through a wrapper class at ≤768px; do not hide the Logo.

- [ ] **Step 6: Verify the Logo source**

Run:

```bash
cmp public/images/logo.svg /Users/bowang/IdeaProjects/cloudNorth/public/images/logo.svg
npm run icons:generate
```

Expected: `cmp` exits 0; icon generation rewrites all four PNG sizes successfully. `public/icons/icon.svg` may retain its white circular toolbar background, but its cloud and north-arrow paths must match `public/images/logo.svg`.

- [ ] **Step 7: Run Task 3 checks**

Run: `npm test -- src/components/StatusBadge.test.ts src/components/AppBrand.test.ts && npm run lint && npm run typecheck`  
Expected: all checks PASS.

- [ ] **Step 8: Commit Task 3**

```bash
npm run git -- add src/components/AppBrand.vue src/components/AppBrand.test.ts src/components/StatusBadge.vue src/components/StatusBadge.test.ts src/layouts/DefaultLayout.vue public/icons/icon16.png public/icons/icon32.png public/icons/icon48.png public/icons/icon128.png
npm run commit -- -m "feat: unify 云计算指北 brand and status components"
```

---

### Task 4: Redesign Popup with scheme A

**Files:**
- Create: `src/PopupApp.test.ts`
- Modify: `src/PopupApp.vue`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh-CN.json`

**Interfaces:**
- Consumes: `deriveProviderSummaries`, `deriveOverallHealth`, `getExtensionVersion`
- Consumes: `AppBrand`, `StatusBadge`
- Preserves: `refresh()`, `openDashboard()`, `openOptions()`

- [ ] **Step 1: Add Popup i18n keys**

Replace `popup.versionNote` and add these exact keys in both locale files:

```json
{
  "popup": {
    "tagline": "Multi-cloud service health",
    "dashboard": "Open dashboard",
    "refresh": "Refresh status",
    "refreshing": "Refreshing…",
    "settings": "Settings",
    "overallStatus": "Overall status",
    "healthyCount": "{healthy} of {total} providers operational",
    "allOperational": "All monitored providers are operational",
    "affectedCount": "{count} providers need attention",
    "loading": "Checking official status sources…",
    "empty": "No provider status is available yet.",
    "retry": "Try again",
    "dataSource": "Data from providers’ official status sources",
    "version": "v{version}"
  }
}
```

```json
{
  "popup": {
    "tagline": "多云服务健康状态",
    "dashboard": "打开仪表盘",
    "refresh": "刷新状态",
    "refreshing": "刷新中…",
    "settings": "设置",
    "overallStatus": "整体运行状态",
    "healthyCount": "{healthy}/{total} 家云服务商正常",
    "allOperational": "当前监控的云服务商均正常",
    "affectedCount": "{count} 家云服务商需要关注",
    "loading": "正在检查官方状态源…",
    "empty": "暂未取得云服务商状态。",
    "retry": "重试",
    "dataSource": "数据来自云厂商官方状态源",
    "version": "v{version}"
  }
}
```

Also add `status.short.unknown` as `Unknown` / `未知`.

- [ ] **Step 2: Write failing Popup tests**

Create `src/PopupApp.test.ts` with Pinia and i18n mounts. Stub `useStatusStore` state through an active Pinia store and stub Chrome navigation:

```ts
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/i18n';
import { useStatusStore } from '@/stores/statusStore';
import PopupApp from './PopupApp.vue';

describe('PopupApp', () => {
  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.stubGlobal('chrome', {
      runtime: {
        getManifest: () => ({ version: '0.1.0' }),
        openOptionsPage: vi.fn(),
        getURL: (path: string) => path
      },
      tabs: { create: vi.fn() }
    });
  });

  it('shows the brand, friendly names, provider-level health and official source copy', async () => {
    const store = useStatusStore();
    store.services = [
      {
        id: 'aws',
        provider: 'AWS',
        serviceId: 'ec2',
        serviceName: 'EC2',
        region: 'global',
        status: 'operational',
        updatedAt: Date.now()
      },
      {
        id: 'cf',
        provider: 'CLOUDFLARE',
        serviceId: 'edge',
        serviceName: 'Edge',
        region: 'global',
        status: 'degraded',
        updatedAt: Date.now()
      }
    ];
    vi.spyOn(store, 'fetchStatus').mockResolvedValue();
    const wrapper = mount(PopupApp, { global: { plugins: [i18n, store.$pinia] } });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Amazon Web Services');
    expect(wrapper.text()).toContain('Cloudflare');
    expect(wrapper.text()).not.toContain('local mock data');
    expect(wrapper.text()).not.toContain('本地模拟数据');
    expect(wrapper.text()).toContain('v0.1.0');
  });
});
```

- [ ] **Step 3: Run Popup tests and verify failure**

Run: `npm test -- src/PopupApp.test.ts`  
Expected: FAIL because the current Popup shows provider codes and the old version note.

- [ ] **Step 4: Replace Popup computed state**

Use:

```ts
const providerSummaries = computed(() => deriveProviderSummaries(statusStore.services));
const overallHealth = computed(() => deriveOverallHealth(providerSummaries.value));
const version = getExtensionVersion();
const hasRows = computed(() => providerSummaries.value.length > 0);
const issueSummary = computed(() =>
  overallHealth.value.affected === 0
    ? t('popup.allOperational')
    : t('popup.affectedCount', { count: overallHealth.value.affected })
);
```

Remove the local `providerSummary` map, severity rank and `badgeClass()`.

- [ ] **Step 5: Replace Popup template with the approved hierarchy**

The root must use:

```vue
<div class="w-[360px] border border-slate-200 bg-slate-50 p-4 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
  <header class="mb-4 flex items-center justify-between gap-3">
    <AppBrand compact :subtitle="t('popup.tagline')" />
    <button type="button" class="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-primary-700 transition-colors duration-200 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-primary-300 dark:hover:bg-slate-800" @click="openDashboard">
      {{ t('popup.dashboard') }}
    </button>
  </header>

  <section class="mb-4 rounded-xl bg-gradient-to-br from-primary-800 to-primary-600 p-4 text-white" :aria-label="t('popup.overallStatus')">
    <p class="text-xs text-primary-100">{{ t('popup.overallStatus') }}</p>
    <p class="mt-1 text-2xl font-bold">{{ t('popup.healthyCount', { healthy: overallHealth.operational, total: overallHealth.total }) }}</p>
    <p class="mt-1 text-xs text-primary-100">{{ issueSummary }}</p>
  </section>

  <div class="mb-2 flex items-center justify-between">
    <h2 class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('common.providers') }}</h2>
    <button type="button" class="min-h-[44px] rounded-md px-2 text-xs font-semibold text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300" :disabled="statusStore.loading" @click="refresh">
      {{ statusStore.loading ? t('popup.refreshing') : t('popup.refresh') }}
    </button>
  </div>

  <p v-if="statusStore.loading && !hasRows" class="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">{{ t('popup.loading') }}</p>
  <div v-else-if="statusStore.error && !hasRows" class="rounded-lg border border-warning-200 bg-warning-50 p-4 text-sm text-warning-800 dark:border-warning-800 dark:bg-warning-900/30 dark:text-warning-200">
    <p>{{ statusStore.error }}</p>
    <button class="mt-2 min-h-[44px] font-semibold underline" type="button" @click="refresh">{{ t('popup.retry') }}</button>
  </div>
  <p v-else-if="!hasRows" class="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">{{ t('popup.empty') }}</p>
  <ul v-else class="max-h-64 space-y-2 overflow-y-auto">
    <li v-for="row in providerSummaries" :key="row.id" class="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
      <span class="truncate text-xs font-semibold">{{ row.name }}</span>
      <StatusBadge :status="row.worst" />
    </li>
  </ul>

  <p v-if="statusStore.error && hasRows" class="mt-3 rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-800 dark:bg-warning-900/30 dark:text-warning-200">{{ statusStore.error }}</p>
  <p class="mt-3 text-[11px] text-slate-500">{{ t('common.lastUpdated') }} {{ lastUpdatedText }}</p>
  <footer class="mt-3 flex items-end justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
    <button type="button" class="min-h-[44px] rounded-md px-1 text-xs text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300" @click="openOptions">{{ t('popup.settings') }}</button>
    <div class="text-right text-[10px] leading-4 text-slate-500">
      <p>{{ t('popup.dataSource') }}</p>
      <p>{{ t('popup.version', { version }) }}</p>
    </div>
  </footer>
</div>
```

- [ ] **Step 6: Run Task 4 checks**

Run: `npm test -- src/PopupApp.test.ts src/components/StatusBadge.test.ts src/utils/statusSummary.test.ts && npm run typecheck && npm run build:chrome`  
Expected: all tests PASS and Popup builds.

- [ ] **Step 7: Commit Task 4**

```bash
npm run git -- add src/PopupApp.vue src/PopupApp.test.ts src/i18n/locales/en.json src/i18n/locales/zh-CN.json
npm run commit -- -m "feat: redesign popup for real multi-cloud status"
```

---

### Task 5: Unify the full-page shell and navigation

**Files:**
- Modify: `src/layouts/DefaultLayout.vue`
- Modify: `src/components/AppNavigation.vue`
- Modify: `src/assets/tailwind.css`

**Interfaces:**
- Consumes: `AppBrand`
- Preserves: current routes, unread notification event and mobile drawer behavior.

- [ ] **Step 1: Remove the duplicate dark-mode wrapper**

Change the root to:

```vue
<div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
```

Remove `:class="{ dark: isDarkMode }"`, the `isDarkMode` computed and every `.app-container.dark ...` selector. Replace them with Tailwind `dark:` variants on `.sidebar`, `.sidebar-header`, `.main-content` and `.sidebar-content`.

- [ ] **Step 2: Align the shell surface and spacing**

Use:

```css
.app-layout { @apply flex h-screen overflow-hidden; }
.sidebar { @apply z-20 flex h-full w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900; }
.sidebar-header { @apply flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800; }
.main-content { @apply flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 dark:bg-slate-950; }
.content-container { @apply mx-auto max-w-7xl; }
```

- [ ] **Step 3: Remove dead navigation styles and strengthen focus**

Delete `.user-profile` through `.menu-item .material-icons` because no template uses them. Keep each `.nav-item` at `min-h-[44px]`, use `focus-visible:ring-2`, and use:

```css
.nav-item.active {
  @apply bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300;
}
```

- [ ] **Step 4: Run Task 5 checks**

Run: `npm run lint && npm run typecheck && npm run build:chrome`  
Expected: all commands exit 0.

- [ ] **Step 5: Commit Task 5**

```bash
npm run git -- add src/layouts/DefaultLayout.vue src/components/AppNavigation.vue src/assets/tailwind.css
npm run commit -- -m "style: align application shell with 云计算指北"
```

---

### Task 6: Apply shared summaries and badges to status pages

**Files:**
- Modify: `src/pages/Dashboard.vue`
- Modify: `src/pages/Providers.vue`
- Modify: `src/pages/ProviderDetail.vue`

**Interfaces:**
- Consumes: `deriveProviderSummaries`, `deriveOverallHealth`
- Consumes: `getProviderDisplayName`
- Consumes: `StatusBadge`

- [ ] **Step 1: Update Dashboard provider-level summary**

Add:

```ts
import StatusBadge from '@/components/StatusBadge.vue';
import { getProviderDisplayName } from '@/utils/providerDisplay';
import { deriveOverallHealth, deriveProviderSummaries } from '@/utils/statusSummary';

const providerSummaries = computed(() => deriveProviderSummaries(statusStore.services));
const overallHealth = computed(() => deriveOverallHealth(providerSummaries.value));
```

Replace the current four service-count stat cards with provider-level cards bound to `overallHealth.operational`, `overallHealth.degraded`, `overallHealth.outage` and `overallHealth.maintenance`. In the table replace:

```vue
<td>{{ getProviderDisplayName(service.provider) }}</td>
<td><StatusBadge :status="service.status" /></td>
```

Delete local `formatStatus()` and `.status-badge`.

- [ ] **Step 2: Replace Providers local aggregation**

Replace the entire `providerCards` computed with:

```ts
const providerCards = computed(() => deriveProviderSummaries(statusStore.services));
```

Render:

```vue
<h2 class="provider-name">{{ provider.name }}</h2>
<StatusBadge :status="provider.worst" />
```

Bind counts to `provider.counts.*`, URL to `provider.statusPageUrl`, and details route to `provider.id`. Remove `getStatusClass()`, `formatStatus()` and duplicate status color CSS. Keep the existing responsive `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.

- [ ] **Step 3: Update ProviderDetail**

Import `getProviderDisplayName` and `StatusBadge`. Replace every provider-code heading with `getProviderDisplayName(providerId)` and every local status badge with:

```vue
<StatusBadge :status="service.status" />
```

Preserve incident links, filters and official status URL behavior.

- [ ] **Step 4: Add page-level regression assertions**

Extend `src/utils/statusSummary.test.ts` with:

```ts
it('uses official names and status-page URLs from the registry', () => {
  const [summary] = deriveProviderSummaries([service('AWS', 'operational')]);
  expect(summary.name).toBe('Amazon Web Services');
  expect(summary.statusPageUrl).toBe('https://health.aws.amazon.com/health/status');
});
```

- [ ] **Step 5: Run Task 6 checks**

Run: `npm test -- src/utils/statusSummary.test.ts src/components/StatusBadge.test.ts && npm run lint && npm run typecheck`  
Expected: all commands PASS.

- [ ] **Step 6: Commit Task 6**

```bash
npm run git -- add src/pages/Dashboard.vue src/pages/Providers.vue src/pages/ProviderDetail.vue src/utils/statusSummary.test.ts
npm run commit -- -m "feat: prioritize provider health across status pages"
```

---

### Task 7: Add theme settings, dynamic About data, and remove stale assets

**Files:**
- Modify carefully: `src/pages/Settings.vue`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh-CN.json`
- Modify: `options.html`
- Delete: `public/css/popup.css`
- Delete: `src/popup.html`

**Interfaces:**
- Consumes: `ThemePreference`, `getExtensionVersion`
- Preserves: current two-language selector and provider permission logic.

- [ ] **Step 1: Add exact theme and About locale keys**

Add under `settings`:

```json
{
  "themeSection": "Appearance",
  "themeHelp": "Choose how Clousight appears. System follows your browser or operating system.",
  "themeLight": "Light",
  "themeDark": "Dark",
  "themeSystem": "System",
  "aboutBrand": "Clousight",
  "officialDataNote": "Status data comes from providers’ official public sources."
}
```

```json
{
  "themeSection": "外观",
  "themeHelp": "选择云计算指北的显示方式；跟随系统会使用浏览器或操作系统主题。",
  "themeLight": "浅色",
  "themeDark": "深色",
  "themeSystem": "跟随系统",
  "aboutBrand": "云计算指北",
  "officialDataNote": "状态数据来自云厂商公开的官方状态源。"
}
```

- [ ] **Step 2: Add theme controls without replacing existing Settings work**

Import:

```ts
import type { ThemePreference } from '@/utils/themeBootstrap';
import { getExtensionVersion } from '@/utils/extensionMeta';

const version = getExtensionVersion();
const themeOptions: Array<{ value: ThemePreference; labelKey: string }> = [
  { value: 'light', labelKey: 'settings.themeLight' },
  { value: 'dark', labelKey: 'settings.themeDark' },
  { value: 'system', labelKey: 'settings.themeSystem' }
];
```

Insert after the language section:

```vue
<section class="settings-section">
  <h3 class="section-title">{{ t('settings.themeSection') }}</h3>
  <p class="section-description">{{ t('settings.themeHelp') }}</p>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <label v-for="option in themeOptions" :key="option.value" class="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
      <input
        type="radio"
        name="theme"
        class="form-radio text-primary-600 focus:ring-primary-500"
        :value="option.value"
        :checked="settings.theme === option.value"
        @change="userStore.setTheme(option.value)"
      />
      <span>{{ t(option.labelKey) }}</span>
    </label>
  </div>
</section>
```

Replace hardcoded About content with:

```vue
<p class="mb-1 font-semibold">{{ t('settings.aboutBrand') }}</p>
<p class="mb-1">{{ t('settings.version') }} {{ version }}</p>
<p>{{ t('settings.officialDataNote') }}</p>
<p class="mt-1 text-xs text-slate-500">{{ t('settings.privacyNote') }}</p>
```

- [ ] **Step 3: Remove stale entry points**

Delete the invalid stylesheet line from `options.html`:

```html
<link rel="stylesheet" href="css/options.css">
```

Delete `public/css/popup.css` and `src/popup.html`. Confirm no references:

Run: `rg "popup\\.css|src/popup\\.html|css/options\\.css" . --glob '!node_modules/**' --glob '!dist*/**'`  
Expected: no matches.

- [ ] **Step 4: Run Task 7 checks**

Run: `npm test -- src/utils/themeBootstrap.test.ts src/utils/extensionMeta.test.ts src/i18n/messageCompiler.test.ts && npm run lint && npm run typecheck`  
Expected: all checks PASS.

- [ ] **Step 5: Review the pre-existing Settings diff before staging**

Run:

```bash
npm run git -- diff -- src/pages/Settings.vue
```

Expected: the diff contains both the pre-existing two-language selector changes and the new theme/version section. Confirm no deleted locale options are restored and no provider permission logic is removed.

- [ ] **Step 6: Commit Task 7**

```bash
npm run git -- add src/pages/Settings.vue src/i18n/locales/en.json src/i18n/locales/zh-CN.json options.html public/css/popup.css src/popup.html
npm run commit -- -m "feat: add shared appearance settings and real data copy"
```

This commit intentionally includes the already-present two-language edits in `Settings.vue` only if they remain uncommitted at execution time; the pre-commit diff review above is mandatory.

---

### Task 8: Extension smoke coverage and full verification

**Files:**
- Modify: `tests/e2e/extension-smoke.spec.ts`
- Verify: `public/manifest.json`
- Verify: `public/icons/icon16.png`
- Verify: `public/icons/icon32.png`
- Verify: `public/icons/icon48.png`
- Verify: `public/icons/icon128.png`

**Interfaces:**
- Verifies the complete built extension; produces no runtime interface.

- [ ] **Step 1: Extend the Playwright smoke assertions**

After opening Popup, add:

```ts
await expect(popup.getByText(/Clousight|云计算指北/)).toBeVisible();
await expect(popup.getByText(/Data from providers’ official status sources|数据来自云厂商官方状态源/)).toBeVisible();
await expect(popup.getByText(/local mock data|本地模拟数据/)).toHaveCount(0);
await expect(popup.locator('html')).not.toHaveClass(/dark/);
await expect(popup.locator('body')).toHaveCSS('overflow-x', 'visible');
```

After opening options, add:

```ts
await expect(options.getByText(/Appearance|外观/)).toBeVisible();
await expect(options.getByText(/0\.1\.0/)).toBeVisible();
```

- [ ] **Step 2: Build Chrome and run the smoke test**

Run:

```bash
npm run build:chrome
npm run e2e -- tests/e2e/extension-smoke.spec.ts
```

Expected: Chrome build and the extension smoke test PASS.

- [ ] **Step 3: Run complete quality gates**

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build:chrome
npm run build:firefox
```

Expected: every command exits 0.

- [ ] **Step 4: Manual visual acceptance**

Load `dist/` as an unpacked Chromium extension and verify:

1. 浏览器 action Popup 打开后稳定为 360px，不因首次视口测量缩成窄条。
2. Default Popup and full page are light.
3. Selecting dark in Settings updates both full page and the next Popup opening.
4. Selecting system follows an OS/browser theme change.
5. Popup、侧栏、工具栏和通知均使用 cloudNew 的蓝色三栏箭头官方 Logo。
6. Provider list uses “Amazon Web Services”, “Microsoft Azure”, “Google Cloud” and other registry names.
7. A fetch failure keeps prior rows and shows a warning.
8. No screen contains “mock”, “模拟数据” or a hardcoded `v0.1`.
9. Keyboard focus is visible on refresh, dashboard, settings, navigation and theme controls.

- [ ] **Step 5: Commit Task 8**

```bash
npm run git -- add tests/e2e/extension-smoke.spec.ts
npm run commit -- -m "test: cover 云计算指北 extension redesign"
```

- [ ] **Step 6: Final repository review**

Run:

```bash
npm run git -- status --short
npm run git -- log -8 --oneline
```

Expected: redesign task files are committed; unrelated pre-existing changes remain visible and untouched. Do not push until the user explicitly requests it.

---

## Phase 2: Incident summaries and official logos

### Task 9: Migrate the authoritative 云计算指北 Logo

**Files:**
- Copy: `/Users/bowang/IdeaProjects/cloudNew/web/public/brand/logo.png` → `public/images/logo.png`
- Copy: `/Users/bowang/IdeaProjects/cloudNew/web/public/brand/icon_512.png` → `public/icons/icon-source.png`
- Modify: `src/components/AppBrand.vue`
- Modify: `src/components/AppBrand.test.ts`
- Modify: `scripts/generate-extension-icons.js`
- Delete: `public/images/logo.svg`
- Delete: `public/icons/icon.svg`

**Interfaces:**
- `AppBrand` continues exposing the same props and switches its image source to `/images/logo.png`.
- `npm run icons:generate` reads `public/icons/icon-source.png` and writes 16/32/48/128px PNGs.

- [ ] Write failing tests asserting `/images/logo.png`, the official source files, and the PNG-based generator.
- [ ] Run `npm test -- src/components/AppBrand.test.ts` and verify the old SVG expectation fails.
- [ ] Copy the authoritative assets, update `AppBrand`, update the generator, and remove stale old-logo sources.
- [ ] Run `npm run icons:generate`, component tests, typecheck, lint, and Chrome build.
- [ ] Commit only Task 9 files with `feat: use official 云计算指北 logo`.

### Task 10: Add local official provider logos

**Files:**
- Create: `public/images/providers/*.svg`
- Create: `public/images/providers/README.md`
- Create: `src/components/ProviderLogo.vue`
- Create: `src/components/ProviderLogo.test.ts`
- Modify: `src/utils/providerDisplay.ts`
- Modify: `src/utils/providerDisplay.test.ts`

**Interfaces:**
- `getProviderLogoUrl(code: string): string | null`
- `<ProviderLogo code: string name: string size?: 'sm' | 'md' />`
- Assets use lowercase registry codes: `aws.svg`, `azure.svg`, `gcp.svg`, `alibaba.svg`, `tencent.svg`, `cloudflare.svg`, `digitalocean.svg`, `linode.svg`, `huawei.svg`, `volcano.svg`.

- [ ] Write failing helper/component tests for known assets, accessible alt text, and initial-letter fallback on unknown or image error.
- [ ] Copy AWS/Azure/GCP/Alibaba/Tencent/Huawei/Volcano assets from cloudNew `research/agent-serverless-benchmark/publish/logo-assets/`.
- [ ] Add Cloudflare, DigitalOcean, and Akamai/Linode marks from official brand kits or Simple Icons as local SVGs; record source URL, retrieval date, trademark ownership, and any attribution guidance in README.
- [ ] Implement the helper and component without runtime network requests.
- [ ] Run focused tests, lint, typecheck, and build; confirm all ten files exist in `dist/images/providers/`.
- [ ] Commit only Task 10 files with `feat: add local cloud provider logos`.

### Task 11: Derive one actionable incident per provider

**Files:**
- Modify: `src/utils/statusSummary.ts`
- Modify: `src/utils/statusSummary.test.ts`

**Interfaces:**
- Extend `ProviderSummary` with:

```ts
headline?: string;
incidentSourceUrl?: string;
```

- [ ] Write failing tests proving headline priority (`statusMessage` → `incident.title` → `serviceName`), event-link priority (`sourceUrl` → `statusPageUrl`), severity-first selection, and newest-event tie breaking.
- [ ] Implement deterministic candidate comparison without changing provider-level counts or ordering.
- [ ] Ensure operational placeholders never emit an incident headline.
- [ ] Run focused tests, full unit tests, typecheck and lint.
- [ ] Commit only Task 11 files with `feat: derive provider incident summaries`.

### Task 12: Render logos, incident summaries, and official links in Popup

**Files:**
- Modify: `src/PopupApp.vue`
- Modify: `src/PopupApp.test.ts`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh-CN.json`
- Modify: `tests/e2e/extension-smoke.spec.ts`

**Interfaces:**
- Consumes `ProviderLogo` and extended `ProviderSummary`.
- Adds localized `popup.officialDetails`.

- [ ] Write failing Popup tests: every row has a provider logo; abnormal rows show one headline and official link; normal rows show neither; missing event links fall back to official provider status pages.
- [ ] Update each row to use a two-layer layout only when `row.worst !== 'operational' && row.headline`.
- [ ] Render the link with `target="_blank"` and `rel="noopener noreferrer"`; preserve 44px touch targets and 360px fixed Popup width.
- [ ] Extend E2E with stable local-asset and link-security assertions that do not depend on live provider incidents.
- [ ] Run lint, typecheck, full unit tests, Chrome/Firefox builds, and extension E2E.
- [ ] Rebuild `dist/`, manually inspect abnormal and normal rows, then commit with `feat: show provider incident details in popup`.

