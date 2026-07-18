<template>
  <div class="subscriptions-page">
    <h2 class="page-title">{{ t('subscriptions.title') }}</h2>
    <p class="page-lead">{{ t('subscriptions.lead') }}</p>

    <div v-if="loadError" class="error-banner">{{ loadError }}</div>

    <div class="toolbar flex flex-wrap items-center gap-3">
      <button
        type="button"
        data-testid="new-rule"
        class="btn btn-primary"
        :disabled="saving || items.length >= SUBSCRIPTION_RULE_MAX"
        @click="startCreate"
      >
        {{ t('subscriptions.newRule') }}
      </button>
      <span
        v-if="items.length >= SUBSCRIPTION_RULE_MAX"
        class="text-sm text-amber-800 dark:text-amber-200"
      >
        {{ t('subscriptions.ruleLimitHint', { max: SUBSCRIPTION_RULE_MAX }) }}
      </span>
    </div>

    <div v-if="loading" class="muted">{{ t('common.loading') }}</div>

    <div v-else-if="items.length === 0" class="muted">{{ t('subscriptions.emptyHint') }}</div>

    <div v-else class="rules-grid">
      <article v-for="row in items" :key="row.id" class="rule-card">
        <header class="rule-head">
          <h3 class="rule-title">{{ row.name }}</h3>
          <div class="rule-actions">
            <button type="button" class="btn-text" @click="startEdit(row)">
              {{ t('common.edit') }}
            </button>
            <button
              type="button"
              class="btn-text danger"
              :disabled="deletingId === row.id"
              @click="remove(row)"
            >
              {{ t('common.delete') }}
            </button>
          </div>
        </header>
        <dl class="rule-dl">
          <dt>{{ t('subscriptions.providers') }}</dt>
          <dd>{{ formatProviders(row.providers) }}</dd>
          <dt>{{ t('subscriptions.minSeverity') }}</dt>
          <dd>{{ row.minSeverity }}</dd>
          <dt>{{ t('subscriptions.channels') }}</dt>
          <dd>{{ row.browser ? t('subscriptions.channelBrowser') : '—' }}</dd>
          <template v-if="row.regions.length">
            <dt>{{ t('common.regions') }}</dt>
            <dd>{{ row.regions.join(', ') }}</dd>
          </template>
          <template v-if="row.services.length">
            <dt>{{ t('providerDetail.services') }}</dt>
            <dd>{{ row.services.join(', ') }}</dd>
          </template>
        </dl>
      </article>
    </div>

    <div v-if="editorOpen" class="editor-panel">
      <h3 class="editor-title">
        {{ editingId ? t('subscriptions.editRule') : t('subscriptions.newRuleTitle') }}
      </h3>
      <form class="editor-form" @submit.prevent="saveEditor">
        <div class="form-group">
          <label class="form-label" for="sub-name">{{ t('common.name') }}</label>
          <input id="sub-name" v-model="form.name" type="text" class="form-input" required />
        </div>

        <div class="form-group">
          <label class="flex items-center gap-2">
            <input
              v-model="form.allProviders"
              data-testid="all-providers"
              type="checkbox"
              class="form-checkbox"
            />
            {{ t('subscriptions.matchAll') }}
          </label>
          <div v-if="!form.allProviders" class="provider-grid mt-2">
            <label v-for="p in providerCodes" :key="p" class="flex items-center gap-2 text-sm">
              <input
                v-model="form.providers"
                type="checkbox"
                :value="p"
                :data-testid="`provider-${p}`"
                class="form-checkbox"
              />
              {{ p }}
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="sub-sev">{{ t('subscriptions.minSeverity') }}</label>
          <select id="sub-sev" v-model="form.minSeverity" class="form-input">
            <option v-for="s in severityOptions" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>

        <template v-if="cascade">
          <div class="form-group" data-testid="region-cascade">
            <span class="form-label">{{ t('subscriptions.regionSelect') }}</span>
            <div class="option-grid">
              <label v-for="r in regionOptions" :key="r" class="flex items-center gap-2 text-sm">
                <input
                  v-model="form.regions"
                  type="checkbox"
                  :value="r"
                  :data-testid="`region-opt-${r}`"
                  class="form-checkbox"
                />
                {{ r }}
              </label>
            </div>
          </div>

          <div v-if="serviceOptions.length" class="form-group" data-testid="service-cascade">
            <span class="form-label">{{ t('subscriptions.serviceSelect') }}</span>
            <div class="option-grid">
              <label v-for="s in serviceOptions" :key="s" class="flex items-center gap-2 text-sm">
                <input
                  v-model="form.services"
                  type="checkbox"
                  :value="s"
                  :data-testid="`service-opt-${s}`"
                  class="form-checkbox"
                />
                {{ s }}
              </label>
            </div>
          </div>

          <p class="text-xs text-slate-500 dark:text-slate-400">
            {{ t('subscriptions.cascadeHint') }}
          </p>
        </template>

        <template v-else>
          <div class="form-group">
            <label class="form-label" for="sub-reg">{{
              t('subscriptions.regionsPlaceholder')
            }}</label>
            <textarea
              id="sub-reg"
              v-model="form.regionsText"
              rows="2"
              data-testid="region-freetext"
              class="form-input font-mono text-sm"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="sub-svc">{{ t('subscriptions.svcKeywords') }}</label>
            <textarea
              id="sub-svc"
              v-model="form.servicesText"
              rows="2"
              class="form-input font-mono text-sm"
            />
          </div>
        </template>

        <div class="form-group">
          <label class="flex items-center gap-2">
            <input v-model="form.browser" type="checkbox" class="form-checkbox" />
            {{ t('subscriptions.channelBrowser') }}
          </label>
        </div>

        <p v-if="formError" class="error-text">{{ formError }}</p>

        <div class="editor-actions">
          <button type="button" class="btn btn-outline" :disabled="saving" @click="cancelEditor">
            {{ t('common.cancel') }}
          </button>
          <button type="submit" data-testid="save-rule" class="btn btn-primary" :disabled="saving">
            {{ saving ? t('common.saving') : t('common.save') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  getSubscriptions,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  SUBSCRIPTION_RULE_MAX,
  type LocalSubscription
} from '@/services/subscriptions';
import { PROVIDER_CODES } from '@/services/providers/registry';
import { getRegionOptions, getServiceOptions, supportsCascade } from '@/services/providers/catalog';
import { SEVERITY_ORDER, type Severity } from '@/services/providers/types';

const { t } = useI18n();

defineOptions({ name: 'SubscriptionsPage' });

const providerCodes = PROVIDER_CODES;
const severityOptions = SEVERITY_ORDER;

const loading = ref(true);
const saving = ref(false);
const loadError = ref('');
const formError = ref('');
const items = ref<LocalSubscription[]>([]);

const editorOpen = ref(false);
const editingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);

const form = ref({
  name: 'default',
  allProviders: true,
  providers: [] as string[],
  minSeverity: 'major' as Severity,
  regions: [] as string[],
  services: [] as string[],
  regionsText: '',
  servicesText: '',
  browser: true
});

// Cascading region/service selection is offered only for providers whose feed
// carries structured region/service data (see providers/catalog.ts).
const selectedCodes = computed(() => (form.value.allProviders ? [] : form.value.providers));
const cascade = computed(() => supportsCascade(selectedCodes.value));
const regionOptions = computed(() => getRegionOptions(selectedCodes.value));
const serviceOptions = computed(() => getServiceOptions(selectedCodes.value));

// Drop any selected region/service the current provider set no longer offers.
// Skip while options are empty (a transient state between provider edits, or a
// non-cascade selection) so valid selections survive switching providers.
watch([regionOptions, serviceOptions], ([regions, services]) => {
  if (regions.length) {
    form.value.regions = form.value.regions.filter(r => regions.includes(r));
  }
  if (services.length) {
    form.value.services = form.value.services.filter(s => services.includes(s));
  }
});

function splitList(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function formatProviders(p: string[]): string {
  return p.length ? p.join(', ') : t('subscriptions.all');
}

async function loadList(): Promise<void> {
  loading.value = true;
  try {
    items.value = await getSubscriptions();
    loadError.value = '';
  } catch {
    loadError.value = t('common.serviceUnavailable');
  } finally {
    loading.value = false;
  }
}

function resetForm(): void {
  form.value = {
    name: 'default',
    allProviders: true,
    providers: [],
    minSeverity: 'major',
    regions: [],
    services: [],
    regionsText: '',
    servicesText: '',
    browser: true
  };
  formError.value = '';
}

function startCreate(): void {
  editingId.value = null;
  resetForm();
  editorOpen.value = true;
}

function startEdit(row: LocalSubscription): void {
  editingId.value = row.id;
  const all = row.providers.length === 0;
  form.value = {
    name: row.name,
    allProviders: all,
    providers: all ? [] : [...row.providers],
    minSeverity: row.minSeverity,
    regions: [...row.regions],
    services: [...row.services],
    regionsText: row.regions.join(', '),
    servicesText: row.services.join(', '),
    browser: row.browser
  };
  formError.value = '';
  editorOpen.value = true;
}

function cancelEditor(): void {
  editorOpen.value = false;
  editingId.value = null;
  resetForm();
}

async function saveEditor(): Promise<void> {
  formError.value = '';
  const providers = form.value.allProviders ? [] : [...form.value.providers];
  if (!form.value.allProviders && providers.length === 0) {
    formError.value = t('subscriptions.selectProvider');
    return;
  }
  const useCascade = cascade.value;
  const input = {
    name: form.value.name.trim() || 'default',
    providers,
    regions: useCascade ? [...form.value.regions] : splitList(form.value.regionsText),
    services: useCascade ? [...form.value.services] : splitList(form.value.servicesText),
    minSeverity: form.value.minSeverity,
    browser: form.value.browser
  };
  saving.value = true;
  try {
    if (editingId.value) {
      await updateSubscription(editingId.value, input);
    } else {
      await addSubscription(input);
    }
    cancelEditor();
    await loadList();
  } catch (e) {
    formError.value = e instanceof Error ? e.message : t('subscriptions.saveFailed');
  } finally {
    saving.value = false;
  }
}

async function remove(row: LocalSubscription): Promise<void> {
  if (!confirm(t('subscriptions.confirmDelete', { name: row.name }))) {
    return;
  }
  deletingId.value = row.id;
  try {
    await deleteSubscription(row.id);
    await loadList();
  } catch {
    loadError.value = t('common.serviceUnavailable');
  } finally {
    deletingId.value = null;
  }
}

onMounted(loadList);
</script>

<style scoped>
.subscriptions-page {
  @apply flex flex-col max-w-4xl;
}

.page-title {
  @apply text-lg font-semibold mb-1 text-slate-900 dark:text-slate-100;
}

.page-lead {
  @apply text-sm text-slate-600 dark:text-slate-400 mb-4;
}

.error-banner {
  @apply text-sm p-3 rounded-lg bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200 mb-3;
}

.muted {
  @apply text-slate-500 dark:text-slate-400 py-6;
}

.toolbar {
  @apply mb-4;
}

.rules-grid {
  @apply grid gap-3 sm:grid-cols-2;
}

.rule-card {
  @apply bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4;
}

.rule-head {
  @apply flex justify-between items-start gap-2 mb-2;
}

.rule-title {
  @apply text-base font-medium text-slate-900 dark:text-slate-100;
}

.rule-actions {
  @apply flex gap-2 shrink-0;
}

.btn-text {
  @apply text-sm text-primary-600 dark:text-primary-400 hover:underline bg-transparent border-0 cursor-pointer p-0;
}

.btn-text.danger {
  @apply text-red-600 dark:text-red-400;
}

.rule-dl {
  @apply text-sm space-y-1 text-slate-700 dark:text-slate-300;
}

.rule-dl dt {
  @apply text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500 font-medium;
}

.rule-dl dd {
  @apply mb-2 last:mb-0;
}

.editor-panel {
  @apply mt-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4;
}

.editor-title {
  @apply text-base font-medium mb-3 text-slate-900 dark:text-slate-100;
}

.editor-form {
  @apply space-y-4 max-w-xl;
}

.form-group {
  @apply space-y-1;
}

.form-label {
  @apply block text-sm font-medium text-slate-700 dark:text-slate-300;
}

.form-input {
  @apply block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm;
}

.form-checkbox {
  @apply h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded;
}

.provider-grid {
  @apply grid grid-cols-2 sm:grid-cols-3 gap-2;
}

.option-grid {
  @apply grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 p-2;
}

.error-text {
  @apply text-sm text-red-600 dark:text-red-400;
}

.editor-actions {
  @apply flex gap-2 pt-2;
}

.btn {
  @apply inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 transition-colors duration-200;
}

.btn-primary {
  @apply bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 disabled:opacity-50;
}

.btn-outline {
  @apply border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:ring-primary-500 disabled:opacity-50;
}
</style>
