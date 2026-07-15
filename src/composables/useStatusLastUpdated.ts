import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStatusStore } from '@/stores/statusStore';

/** Localized “last updated” text driven by current i18n locale. */
export function useStatusLastUpdated() {
  const statusStore = useStatusStore();
  const { locale, t } = useI18n();

  return computed(() => {
    if (!statusStore.lastUpdated) {
      return t('common.never');
    }
    return new Intl.DateTimeFormat(locale.value, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(statusStore.lastUpdated));
  });
}
