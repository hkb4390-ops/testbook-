import { SUPPLIED_API_PATHS, VERIFIED_OPERATION_PATHS } from '../config/apiConfig';
import type { AttemptResultResponse, V1AttemptItem } from '../types/testbook';
import { testbookApi } from './testbookApi';

export interface UpstreamResponsePayload {
  markedOption: string | null;
  isBookmarked: boolean;
  time: number;
  lang: string;
  visits: Array<{
    time: number;
    attempts: number;
    nextqid: string;
    logs: Array<{ t: string; at: number; v: string }>;
  }>;
}

export const attemptsService = {
  async getV1Attempts(): Promise<V1AttemptItem[]> {
    const res = await testbookApi.request<{ success: boolean; attempts?: V1AttemptItem[] }>(
      SUPPLIED_API_PATHS.V1_ATTEMPTS,
      { cacheTtlMs: 15_000 }
    );
    return Array.isArray(res.attempts) ? res.attempts : [];
  },

  async saveProgress(
    attemptId: string,
    payload: {
      testId: string;
      engine?: string;
      currentQuestion: string;
      timeLeft: number;
      responses: Record<string, UpstreamResponsePayload>;
    }
  ): Promise<{ success: boolean }> {
    return testbookApi.request<{ success: boolean }>(
      VERIFIED_OPERATION_PATHS.V2_ATTEMPT_SAVE(attemptId),
      {
        method: 'POST',
        body: {
          testId: payload.testId,
          engine: payload.engine || 'tb',
          currentQuestion: payload.currentQuestion,
          timeLeft: payload.timeLeft,
          responses: payload.responses,
        },
      }
    );
  },

  async submitAttempt(
    attemptId: string,
    payload: {
      testId: string;
      seriesSlug: string;
      engine?: string;
      currentQuestion: string;
      responses: Record<string, UpstreamResponsePayload>;
    }
  ): Promise<AttemptResultResponse> {
    const res = await testbookApi.request<AttemptResultResponse>(
      VERIFIED_OPERATION_PATHS.V2_ATTEMPT_SUBMIT(attemptId),
      {
        method: 'POST',
        body: {
          testId: payload.testId,
          seriesSlug: payload.seriesSlug,
          engine: payload.engine || 'tb',
          currentQuestion: payload.currentQuestion,
          responses: payload.responses,
        },
      }
    );

    // Invalidate cached history & stats after submission
    testbookApi.invalidate(SUPPLIED_API_PATHS.V2_HISTORY);
    testbookApi.invalidate(SUPPLIED_API_PATHS.V2_STATS);
    testbookApi.invalidate(SUPPLIED_API_PATHS.V1_ATTEMPTS);

    return res;
  },
};
