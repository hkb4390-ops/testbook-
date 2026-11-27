import { VERIFIED_OPERATION_PATHS } from '../config/apiConfig';
import type { AttemptSolutionsResponse } from '../types/testbook';
import { testbookApi } from './testbookApi';

export const solutionsService = {
  async getAttemptSolutions(
    attemptId: string,
    lang?: string
  ): Promise<AttemptSolutionsResponse> {
    return testbookApi.request<AttemptSolutionsResponse>(
      VERIFIED_OPERATION_PATHS.V2_ATTEMPT_SOLUTIONS(attemptId, lang),
      { cacheTtlMs: 30_000 }
    );
  },
};
