import { SUPPLIED_API_PATHS, VERIFIED_OPERATION_PATHS } from '../config/apiConfig';
import type { HomeFeedResponse, TrendingSearchItem } from '../types/testbook';
import { testbookApi } from './testbookApi';

export const trendingService = {
  async getTrendingTop10(): Promise<TrendingSearchItem[]> {
    const res = await testbookApi.request<{
      success: boolean;
      searches?: TrendingSearchItem[];
    }>(SUPPLIED_API_PATHS.V2_TRENDING_TOP10, { cacheTtlMs: 45_000 });

    return Array.isArray(res.searches) ? res.searches.slice(0, 10) : [];
  },

  async getHomeFeed(): Promise<HomeFeedResponse> {
    return testbookApi.request<HomeFeedResponse>(VERIFIED_OPERATION_PATHS.V2_HOME, {
      cacheTtlMs: 60_000,
    });
  },
};
