/**
 * Centralized Testbook API Configuration.
 * Preserves all supplied V1 & V2 paths verbatim alongside verified operational endpoints.
 * All browser requests route through `/api/tb` to keep upstream base config server-side.
 */

export const PROXY_BASE_PATH = '/api/tb';

export const SUPPLIED_API_PATHS = {
  // TESTBOOK V1
  V1_SERIES: '/testbook/series',
  V1_SERIES_SLASH: '/testbook/series/',
  V1_ATTEMPTS: '/testbook/attempts',

  // TESTBOOK V2
  V2_SERIES: '/testbookv2/series',
  V2_TESTS: '/testbookv2/tests',
  V2_HISTORY: '/testbookv2/history',
  V2_ATTEMPTS: '/testbookv2/attempts',
  V2_STATS: '/testbookv2/stats',
  V2_SEARCH: '/testbookv2/search',
  V2_TRENDING_TOP10: '/testbookv2/trending?limit=10',
} as const;

export const VERIFIED_OPERATION_PATHS = {
  V2_HOME: '/testbookv2/home',
  V2_SERIES_DETAIL: (slug: string) => `/testbookv2/series/${encodeURIComponent(slug)}`,
  V2_SECTION_TESTS: (slug: string, sectionId: string) =>
    `/testbookv2/series/${encodeURIComponent(slug)}/sections/${encodeURIComponent(sectionId)}/tests`,
  V1_SERIES_TESTS: (slug: string) => `/testbook/series/${encodeURIComponent(slug)}/tests`,
  V1_TEST_DETAIL: (testId: string) => `/testbook/tests/${encodeURIComponent(testId)}`,
  V2_TEST_INSTRUCTIONS: (testId: string, slug: string) =>
    `/testbookv2/tests/${encodeURIComponent(testId)}/instructions?slug=${encodeURIComponent(slug)}`,
  V2_ATTEMPT_START: (testId: string) => `/testbookv2/attempts/${encodeURIComponent(testId)}/start`,
  V2_ATTEMPT_SAVE: (attemptId: string) => `/testbookv2/attempts/${encodeURIComponent(attemptId)}/save`,
  V2_ATTEMPT_SUBMIT: (attemptId: string) => `/testbookv2/attempts/${encodeURIComponent(attemptId)}/submit`,
  V2_ATTEMPT_RESULT: (attemptId: string) => `/testbookv2/attempts/${encodeURIComponent(attemptId)}/result`,
  V2_ATTEMPT_SOLUTIONS: (attemptId: string, lang?: string) =>
    `/testbookv2/attempts/${encodeURIComponent(attemptId)}/solutions${
      lang ? `?lang=${encodeURIComponent(lang)}` : ''
    }`,
} as const;

export const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  hn: 'हिन्दी',
  te: 'తెలుగు',
  mr: 'मराठी',
  bn: 'বাংলা',
  ml: 'മലയാളം',
  gu: 'ગુજરાતી',
  kn: 'ಕನ್ನಡ',
  ta: 'தமிழ்',
  or: 'ଓଡ଼ିଆ',
  as: 'অসমীয়া',
  pa: 'ਪੰਜਾਬੀ',
  ur: 'اردو',
  sa: 'संस्कृतम्',
  ne: 'नेपाली',
};

export function getLanguageLabel(code: string): string {
  return LANGUAGE_LABELS[code] || code.toUpperCase();
}
