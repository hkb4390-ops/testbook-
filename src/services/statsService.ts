import { SUPPLIED_API_PATHS } from '../config/apiConfig';
import type { StatsResponse } from '../types/testbook';
import { testbookApi } from './testbookApi';

export const statsService = {
  async getStats(): Promise<StatsResponse> {
    return testbookApi.request<StatsResponse>(SUPPLIED_API_PATHS.V2_STATS, {
      cacheTtlMs: 15_000,
    });
  },
};
