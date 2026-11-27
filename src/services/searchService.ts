import { SUPPLIED_API_PATHS } from '../config/apiConfig';
import type { NormalizedSeries, V2SeriesItem } from '../types/testbook';
import { testbookApi } from './testbookApi';
import { normalizeV2Series } from './seriesService';

const RECENT_SEARCHES_KEY = 'tb_recent_searches_v1';
const MAX_RECENT = 8;

export const searchService = {
  async search(query: string): Promise<NormalizedSeries[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const res = await testbookApi.request<{
      success: boolean;
      query?: string;
      data?: V2SeriesItem[];
    }>(`${SUPPLIED_API_PATHS.V2_SEARCH}?q=${encodeURIComponent(trimmed)}`, {
      cacheTtlMs: 20_000,
    });

    const items = Array.isArray(res.data) ? res.data : [];
    return items.map(normalizeV2Series);
  },

  getRecentSearches(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  },

  saveRecentSearch(query: string): string[] {
    const trimmed = query.trim();
    if (!trimmed) return this.getRecentSearches();
    const current = this.getRecentSearches().filter(
      (q) => q.toLowerCase() !== trimmed.toLowerCase()
    );
    const next = [trimmed, ...current].slice(0, MAX_RECENT);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
    return next;
  },

  clearRecentSearches(): string[] {
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // ignore
    }
    return [];
  },
};
