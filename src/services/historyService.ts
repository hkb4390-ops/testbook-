import { SUPPLIED_API_PATHS } from '../config/apiConfig';
import type { HistoryAttemptItem, V1AttemptItem } from '../types/testbook';
import { testbookApi } from './testbookApi';
import { attemptsService } from './attemptsService';

export const historyService = {
  async getHistory(): Promise<HistoryAttemptItem[]> {
    const res = await testbookApi.request<{
      success: boolean;
      count?: number;
      attempts?: HistoryAttemptItem[];
    }>(SUPPLIED_API_PATHS.V2_HISTORY, { cacheTtlMs: 10_000 });

    return Array.isArray(res.attempts) ? res.attempts : [];
  },

  async getCombinedHistory(): Promise<{
    v2Attempts: HistoryAttemptItem[];
    v1Attempts: V1AttemptItem[];
  }> {
    const [v2Res, v1Res] = await Promise.allSettled([
      this.getHistory(),
      attemptsService.getV1Attempts(),
    ]);

    const v2Attempts = v2Res.status === 'fulfilled' ? v2Res.value : [];
    const seenIds = new Set(v2Attempts.map((a) => a.attemptId));

    const v1Attempts =
      v1Res.status === 'fulfilled'
        ? v1Res.value.filter((a) => !seenIds.has(a.id))
        : [];

    if (v2Res.status === 'rejected' && v1Res.status === 'rejected') {
      throw v2Res.reason;
    }

    return { v2Attempts, v1Attempts };
  },
};
