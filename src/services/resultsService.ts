import { VERIFIED_OPERATION_PATHS } from '../config/apiConfig';
import type { AttemptResultResponse } from '../types/testbook';
import { testbookApi } from './testbookApi';

export const resultsService = {
  async getAttemptResult(attemptId: string): Promise<AttemptResultResponse> {
    return testbookApi.request<AttemptResultResponse>(
      VERIFIED_OPERATION_PATHS.V2_ATTEMPT_RESULT(attemptId),
      { cacheTtlMs: 30_000 }
    );
  },
};
