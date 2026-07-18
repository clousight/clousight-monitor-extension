# Cascading subscription filters (data-supported providers) — Implementation Plan

> REQUIRED SUB-SKILL: superpowers:test-driven-development — implement task-by-task,
> tests first. Steps use checkbox (`- [ ]`) tracking.

**Goal:** Replace the free-text *region* and *service* inputs in the subscription
rule editor with **cascading dropdowns** driven by a static, locally-bundled
catalog — but only for the providers whose public status feed actually carries
structured region/service data (**AWS**: region; **Alibaba Cloud**: region +
service). Other providers keep the provider + severity matching they have today.

**Why scoped this way:** most public status feeds are incident-level (title +
impact) with no structured region/service. Offering region/service selectors for
those providers would silently drop real incidents (the matcher rejects an event
whose `region` is null when the rule specifies regions). AWS regions align
exactly with the parser's title-extracted `xx-yyy-N` codes; Alibaba exposes
`region`/`productName` via its API. See `src/services/providers/parsers/*`.

**Architecture:** No backend, no new network at runtime. Add a static catalog
module; the rule data model (`regions: string[]`, `services: string[]`) and the
matcher are unchanged — the dropdowns simply produce cleaner values. The
selectors are shown only when every selected provider is in the cascade set
`{AWS, ALIBABA}` and "match all providers" is off, which by construction avoids
the null-region footgun.

**Tech Stack:** Vue 3 `<script setup lang=ts>`, TypeScript strict, Pinia,
vue-i18n, Tailwind, Vitest + Vue Test Utils. Both en + zh-CN locale keys.

## Global Constraints

- No backend/account/telemetry; no runtime network beyond existing feeds.
- New user-visible copy goes into `en.json` and `zh-CN.json` (English source).
- Keep free-text entry available for advanced/other providers so existing rules
  (and non-cascade providers) still work; never restore removed locales.
- Alibaba region/service matching is best-effort (fuzzy substring); AWS is exact.
- Stage only each task's files; commit via `npm run commit -- ...`.

---

### Task 1: Static provider region/service catalog

**Files:**
- Create: `src/services/providers/catalog.ts`
- Create: `src/services/providers/catalog.test.ts`

**Interfaces:**
- `CASCADE_PROVIDER_CODES: readonly string[]` — `['AWS', 'ALIBABA']`.
- `interface ProviderCatalog { regions: string[]; services: string[] }`
- `getProviderCatalog(code: string): ProviderCatalog | null`
- `getRegionOptions(codes: string[]): string[]` — sorted union, deduped.
- `getServiceOptions(codes: string[]): string[]` — sorted union, deduped.
- `supportsCascade(codes: string[]): boolean` — true iff non-empty and every
  code is in `CASCADE_PROVIDER_CODES`.

- [ ] Write failing tests: known catalogs for AWS (regions only, `services: []`)
      and Alibaba (regions + services); `null` for unknown/non-cascade codes;
      union+dedup+sort across `['AWS','ALIBABA']`; `supportsCascade` true for
      `['AWS']`, false for `[]`, `['GCP']`, `['AWS','GCP']`.
- [ ] Run `npm test -- src/services/providers/catalog.test.ts` → FAIL.
- [ ] Implement the catalog with curated AWS region codes and Alibaba
      region ids + short service names (abbreviations that substring-match the
      feed's `productName`, e.g. `ECS`, `OSS`, `RDS`).
- [ ] Run focused tests + `npm run typecheck` → PASS.
- [ ] Commit: `feat: add static provider region/service catalog`.

---

### Task 2: Cascading region/service selectors in the rule editor

**Files:**
- Modify: `src/pages/Subscriptions.vue`
- Modify: `src/i18n/locales/en.json`, `src/i18n/locales/zh-CN.json`
- Create: `src/pages/Subscriptions.test.ts`

**Behavior:**
- Compute `cascade = supportsCascade(selectedProviderCodes)` where selected codes
  come from the checked providers (and is false when "match all" is on).
- When `cascade`:
  - Show a **region** multi-select (checkbox list) from
    `getRegionOptions(codes)`; bind to `form.regions`.
  - Show a **service** multi-select from `getServiceOptions(codes)` only if any
    selected provider has services (Alibaba); bind to `form.services`.
  - Prune any selected region/service no longer offered when providers change.
  - Show a short hint that filtering is exact for AWS and best-effort for
    Alibaba, and that region-less incidents won't match a region filter.
- When not `cascade`: keep the existing free-text region/service textareas
  (advanced), unchanged, so other providers and existing rules still work.
- Persist the same `regions: string[]` / `services: string[]` shape; no matcher
  or storage change.

- [ ] Write failing component tests: selecting AWS shows the region dropdown with
      catalog options and no service dropdown; selecting Alibaba shows both;
      "match all" or selecting GCP shows the free-text fallback (no dropdown);
      changing providers prunes stale selections; saving persists chosen values.
- [ ] Run `npm test -- src/pages/Subscriptions.test.ts` → FAIL.
- [ ] Add i18n keys (`subscriptions.regionSelect`, `subscriptions.serviceSelect`,
      `subscriptions.cascadeHint`, `subscriptions.advancedFilters`) to en + zh-CN.
- [ ] Implement the cascading UI in `Subscriptions.vue`.
- [ ] Run focused tests, full unit tests, `npm run lint`, `npm run typecheck`,
      `npm run build:chrome` → all PASS; verify i18n key parity.
- [ ] Commit: `feat: cascading region/service filters for AWS and Alibaba rules`.

---

### Task 3: Verification

- [ ] `npm run lint && npm run typecheck && npm test && npm run build:chrome && npm run build:firefox`.
- [ ] Manual: create an AWS rule → region dropdown; Alibaba rule → region +
      service; GCP/all rule → free-text only; edit round-trips selections.
