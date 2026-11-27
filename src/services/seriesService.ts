import { SUPPLIED_API_PATHS, VERIFIED_OPERATION_PATHS } from '../config/apiConfig';
import type {
  HomeFeedResponse,
  NormalizedSeries,
  V1SeriesItem,
  V2SeriesItem,
} from '../types/testbook';
import { testbookApi } from './testbookApi';

function normalizeV1Series(item: V1SeriesItem): NormalizedSeries {
  return {
    id: item.id,
    slug: item.series_id,
    name: item.series_name,
    category: item.category,
    icon: item.icon,
    languages: item.languages || [],
    totalTests: Number(item.total_tests) || 0,
    engine: 'tb',
    updatedAt: item.updated_at,
  };
}

export function normalizeV2Series(item: V2SeriesItem): NormalizedSeries {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    category: item.courseName || undefined,
    icon: item.icon,
    colourHex: item.colourHex,
    languages: item.languages || [],
    totalTests: Number(item.totalTestCount) || 0,
    freeTestCount: item.freeTestCount,
    paidTestCount: item.paidTestCount,
    totalAttempts: item.totalAttempts,
    isFree: item.isFree,
    engine: item.engine || 'tb',
    superSections: item.superSections,
    sections: item.sections,
    description: item.description,
  };
}

export const seriesService = {
  async getV1Series(): Promise<V1SeriesItem[]> {
    const res = await testbookApi.request<{ success: boolean; series?: V1SeriesItem[] }>(
      SUPPLIED_API_PATHS.V1_SERIES,
      { cacheTtlMs: 60_000 }
    );
    return Array.isArray(res.series) ? res.series : [];
  },

  async getV1SeriesTrailingSlash(): Promise<V1SeriesItem[]> {
    const res = await testbookApi.request<{ success: boolean; series?: V1SeriesItem[] }>(
      SUPPLIED_API_PATHS.V1_SERIES_SLASH,
      { cacheTtlMs: 60_000 }
    );
    return Array.isArray(res.series) ? res.series : [];
  },

  async getAllSeries(): Promise<NormalizedSeries[]> {
    const [v1Res, homeRes] = await Promise.allSettled([
      this.getV1Series(),
      testbookApi.request<HomeFeedResponse>(VERIFIED_OPERATION_PATHS.V2_HOME, {
        cacheTtlMs: 60_000,
      }),
    ]);

    const merged = new Map<string, NormalizedSeries>();

    if (v1Res.status === 'fulfilled') {
      for (const s of v1Res.value) {
        merged.set(s.series_id, normalizeV1Series(s));
      }
    }

    if (homeRes.status === 'fulfilled' && Array.isArray(homeRes.value.featured)) {
      for (const s of homeRes.value.featured) {
        const existing = merged.get(s.slug);
        const v2 = normalizeV2Series(s);
        if (existing) {
          merged.set(s.slug, {
            ...existing,
            ...v2,
            category: existing.category || v2.category,
            totalTests: v2.totalTests || existing.totalTests,
          });
        } else {
          merged.set(s.slug, v2);
        }
      }
    }

    if (merged.size === 0 && v1Res.status === 'rejected') {
      throw v1Res.reason;
    }

    return Array.from(merged.values());
  },

  async getSeriesDetail(slug: string): Promise<NormalizedSeries> {
    const res = await testbookApi.request<{ success: boolean; series?: V2SeriesItem }>(
      VERIFIED_OPERATION_PATHS.V2_SERIES_DETAIL(slug),
      { cacheTtlMs: 45_000 }
    );
    if (!res.series) {
      throw new Error('Test series details were not returned by the server.');
    }
    return normalizeV2Series(res.series);
  },
};
