/**
 * Status store for managing cloud service status data
 */

import { defineStore } from 'pinia';
import { ServiceStatus, StatusType, DashboardStats } from '@/types/status';
import { fetchCloudStatus } from '@/services/statusService';

interface StatusState {
  services: ServiceStatus[];
  lastUpdated: number | null;
  loading: boolean;
  error: string | null;

  // Filters
  providerFilter: string | null;
  regionFilter: string | null;
  categoryFilter: string | null;
  serviceFilter: string | null;
  statusFilter: StatusType | null;
}

export const useStatusStore = defineStore('status', {
  state: (): StatusState => ({
    services: [],
    lastUpdated: null,
    loading: false,
    error: null,

    // Filters
    providerFilter: null,
    regionFilter: null,
    categoryFilter: null,
    serviceFilter: null,
    statusFilter: null
  }),

  getters: {
    /**
     * Get filtered services based on current filters
     */
    filteredServices: (state): ServiceStatus[] => {
      return state.services.filter(service => {
        // Apply provider filter
        if (state.providerFilter && state.providerFilter !== 'all') {
          const providerMatch =
            service.provider.toLowerCase() === state.providerFilter.toLowerCase();
          if (!providerMatch) return false;
        }

        // Apply region filter
        if (state.regionFilter && state.regionFilter !== 'all') {
          const regionMatch =
            service.regionId === state.regionFilter || service.region === state.regionFilter;
          if (!regionMatch) return false;
        }

        // Apply category filter
        if (state.categoryFilter && state.categoryFilter !== 'all') {
          if (service.category !== state.categoryFilter) return false;
        }

        // Apply service filter
        if (state.serviceFilter && state.serviceFilter !== 'all') {
          if (service.serviceId !== state.serviceFilter) return false;
        }

        // Apply status filter
        if (state.statusFilter) {
          if (service.status !== state.statusFilter) return false;
        }

        return true;
      });
    },

    /**
     * Get stats for the current filtered services
     */
    stats(): DashboardStats {
      const filtered = this.filteredServices;

      return {
        totalServices: filtered.length,
        operational: filtered.filter(s => s.status === 'operational').length,
        degraded: filtered.filter(s => s.status === 'degraded').length,
        outage: filtered.filter(s => s.status === 'outage').length,
        maintenance: filtered.filter(s => s.status === 'maintenance').length,
        lastUpdated: this.lastUpdated || Date.now()
      };
    },

    /**
     * Get unique providers from current services
     */
    providers: (state): { id: string; name: string }[] => {
      const providers = new Map<string, string>();

      state.services.forEach(service => {
        providers.set(service.provider.toLowerCase(), service.provider);
      });

      return Array.from(providers).map(([id, name]) => ({ id, name }));
    },

    /**
     * Get unique regions from current services
     */
    regions: (state): { id: string; name: string }[] => {
      const regions = new Map<string, string>();

      state.services.forEach(service => {
        regions.set(service.regionId || service.region, service.region);
      });

      return Array.from(regions).map(([id, name]) => ({ id, name }));
    },

    /**
     * Get unique service categories from current services
     */
    categories: (state): string[] => {
      const categories = new Set<string>();

      state.services.forEach(service => {
        if (service.category) {
          categories.add(service.category);
        }
      });

      return Array.from(categories);
    },

    /**
     * Get formatted last updated time
     */
    formattedLastUpdated: (state): string => {
      if (!state.lastUpdated) return 'Never';

      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(state.lastUpdated));
    }
  },

  actions: {
    /**
     * Light preload from the same keys the background worker writes, so the first
     * UI frame can show last-known rows before `getStatus` / `forceRefresh` returns.
     */
    async hydrateStatusFromExtensionStorage(): Promise<void> {
      if (typeof chrome === 'undefined' || !chrome.storage?.local || !chrome.runtime?.id) {
        return;
      }
      if (this.services.length > 0) {
        return;
      }

      const data = await new Promise<Record<string, unknown>>(resolve => {
        chrome.storage.local.get(['serviceStatus', 'lastUpdated'], d => {
          resolve((d || {}) as Record<string, unknown>);
        });
      });

      const raw = data.serviceStatus;
      if (!Array.isArray(raw) || raw.length === 0) {
        return;
      }

      const first = raw[0] as Record<string, unknown>;
      if (typeof first?.id !== 'string' || typeof first?.provider !== 'string') {
        return;
      }

      this.services = raw as ServiceStatus[];
      const lu = data.lastUpdated;
      if (typeof lu === 'number' && Number.isFinite(lu)) {
        this.lastUpdated = lu;
      } else {
        this.lastUpdated = Date.now();
      }
    },

    /**
     * Fetch the latest cloud status from APIs
     */
    async fetchStatus() {
      this.error = null;

      try {
        // If in Chrome extension, get from background
        if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
          await this.hydrateStatusFromExtensionStorage();
          this.loading = true;
          await this.fetchFromBackground();
        } else {
          this.loading = true;
          // Direct fetch for development
          const services = await fetchCloudStatus();
          this.services = services;
          this.lastUpdated = Date.now();
        }
      } catch (error) {
        console.error('Error fetching status:', error);
        this.error = error instanceof Error ? error.message : 'Unknown error';
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetch status from extension background script
     */
    async fetchFromBackground() {
      return new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'getStatus' }, response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response && response.status) {
            this.services = response.status;
            this.lastUpdated = Date.now();
            resolve();
          } else {
            reject(new Error('Invalid response from background script'));
          }
        });
      });
    },

    /**
     * Force a refresh of status data
     */
    async refreshStatus() {
      this.error = null;

      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
          await this.hydrateStatusFromExtensionStorage();
          this.loading = true;
          await this.forceRefreshFromBackground();
        } else {
          this.loading = true;
          // Direct fetch for development
          const services = await fetchCloudStatus();
          this.services = services;
          this.lastUpdated = Date.now();
        }
      } catch (error) {
        console.error('Error refreshing status:', error);
        this.error = error instanceof Error ? error.message : 'Unknown error';
      } finally {
        this.loading = false;
      }
    },

    /**
     * Force background script to refresh status
     */
    async forceRefreshFromBackground() {
      return new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'forceRefresh' }, response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response && response.status) {
            this.services = response.status;
            this.lastUpdated = Date.now();
            resolve();
          } else {
            reject(new Error('Invalid response from background script'));
          }
        });
      });
    },

    /**
     * Set filters
     */
    setFilters(filters: {
      provider?: string | null;
      region?: string | null;
      category?: string | null;
      service?: string | null;
      status?: StatusType | null;
    }) {
      if (filters.provider !== undefined) this.providerFilter = filters.provider;
      if (filters.region !== undefined) this.regionFilter = filters.region;
      if (filters.category !== undefined) this.categoryFilter = filters.category;
      if (filters.service !== undefined) this.serviceFilter = filters.service;
      if (filters.status !== undefined) this.statusFilter = filters.status;
    },

    /**
     * Clear all filters
     */
    clearFilters() {
      this.providerFilter = null;
      this.regionFilter = null;
      this.categoryFilter = null;
      this.serviceFilter = null;
      this.statusFilter = null;
    }
  }
});
