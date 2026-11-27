export interface V1SeriesItem {
  series_id: string;
  id: string;
  series_name: string;
  total_tests: number;
  category?: string;
  updated_at?: string;
  languages?: string[];
  icon?: string;
}

export interface V2SubSection {
  id: string;
  name: string;
  shortName?: string | null;
  order?: number;
  paidTestCount?: number;
  freeTestCount?: number;
  cachedTestCount?: number | null;
  availableTestCount?: number;
}

export interface V2SeriesSection {
  id: string;
  superSectionId?: string;
  isPro?: boolean;
  name: string;
  shortName?: string | null;
  order?: number;
  paidTestCount?: number;
  freeTestCount?: number;
  cachedTestCount?: number | null;
  subsections?: V2SubSection[];
}

export interface V2SuperSection {
  id: string;
  name: string;
  isPro?: boolean;
}

export interface V2SeriesItem {
  id: string;
  slug: string;
  engine?: string;
  name: string;
  courseName?: string;
  icon?: string;
  colourHex?: string;
  languages?: string[];
  platform?: string;
  isFree?: boolean;
  totalAttempts?: number;
  paidTestCount?: number;
  freeTestCount?: number;
  totalTestCount?: number;
  servedCounts?: {
    tb?: number;
    tbPro?: number;
    classified?: boolean;
    computedAt?: string;
  };
  superSections?: V2SuperSection[];
  sectionCount?: number;
  description?: string;
  sections?: V2SeriesSection[];
}

export interface NormalizedSeries {
  id: string;
  slug: string;
  name: string;
  category?: string;
  icon?: string;
  colourHex?: string;
  languages: string[];
  totalTests: number;
  freeTestCount?: number;
  paidTestCount?: number;
  totalAttempts?: number;
  isFree?: boolean;
  engine: string;
  updatedAt?: string;
  superSections?: V2SuperSection[];
  sections?: V2SeriesSection[];
  description?: string;
}

export interface V1TestItem {
  test_id: string;
  series_id: string;
  section_id?: string;
  sub_section_id?: string;
  test_name: {
    en?: string;
    hn?: string;
    [key: string]: string | undefined;
  } | string;
  duration_mins: number;
  total_marks: number;
  total_questions: number;
  is_free: boolean;
  is_attempted?: boolean;
  languages?: string[];
  created_at?: string;
  // Added when enriched client-side with series metadata
  seriesSlug?: string;
  seriesName?: string;
  category?: string;
  sectionName?: string;
}

export interface TrendingSearchItem {
  query: string;
  count: number;
  previousCount?: number;
  delta?: number;
}

export interface HomeFeedResponse {
  success: boolean;
  trending: TrendingSearchItem[];
  featured: V2SeriesItem[];
  catalogueCounts?: {
    tb?: number;
    gd?: number;
    total?: number;
  };
}

export interface InstructionSection {
  id: string;
  title: string;
  qCount: number;
  timeLimit: number;
}

export interface TestInstructions {
  testId: string;
  seriesSlug: string;
  engine: string;
  title: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  languages: string[];
  languageCodes: string[];
  hasNegativeMarking: boolean;
  maxNegativeMarks: number;
  marksPerQuestion: number[];
  hasSectionTimers: boolean;
  sections: InstructionSection[];
}

export interface ExamOption {
  prompt: string;
  value: string;
}

export interface QuestionLangBlock {
  text?: string;
  comprehension?: string;
  options?: ExamOption[];
  range?: { start?: string; end?: string };
}

export interface ExamQuestion {
  id: string;
  type: string;
  isNum?: boolean;
  posMarks: number;
  negMarks: number;
  skipMarks?: number;
  isPartialMarking?: boolean;
  partialMarks?: { type?: string; marks?: number };
  ssNo?: number;
  sssNo?: number;
  qsNo?: number;
  defaultLang?: string;
  byLang: Record<string, QuestionLangBlock>;
}

export interface ExamSection {
  id: string;
  title: string;
  timeLimit: number;
  questions: ExamQuestion[];
}

export interface ExamPaper {
  testId: string;
  seriesSlug: string;
  engine: string;
  variant?: string;
  title: string;
  durationMinutes: number;
  languages: string[];
  languageCodes: string[];
  totalQuestions: number;
  totalMarks: number;
  hasNegativeMarking: boolean;
  sections: ExamSection[];
}

export interface SavedResponseEntry {
  markedOption?: string | string[] | null;
  isBookmarked?: boolean;
  time?: number;
  lang?: string;
  visits?: Array<{
    time?: number;
    attempts?: number;
    nextqid?: string;
    logs?: Array<{ t: string; at: number; v: string }>;
  }>;
}

export interface StartAttemptResponse {
  success: boolean;
  attempt: {
    attemptId: string;
    upstreamAttemptId?: string;
    timeLeft: number;
    status: string;
    resuming?: boolean;
    engine?: string;
    variant?: string;
  };
  savedResponses?: Record<string, SavedResponseEntry>;
  paper: ExamPaper;
}

export interface GroupAnalysisItem {
  key: string;
  label: string;
  score: number;
  total: number;
  correct: number;
  partial: number;
  skipped: number;
  incorrect: number;
  accuracy: number;
  maxScore: number;
  attempted: number;
  timeSpent: number;
  percentage?: number;
}

export interface ResultTotals {
  score: number;
  totalMarks: number;
  percentage: number;
  accuracy: number;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  partialCount?: number;
  unscoredCount?: number;
  bookmarkedCount?: number;
  answerChangeCount?: number;
  timeSpentSeconds: number;
  estimatedPercentile?: number;
}

export interface AttemptBehaviour {
  answerChanges?: number;
  bookmarked?: number;
  revisitedQuestions?: number;
  averageTimePerQuestion?: number;
  fastestQuestionTime?: number;
  slowestQuestionTime?: number;
  languagesUsed?: string[];
}

export interface CohortComparison {
  betterThanCohort?: number;
  worseThanCohort?: number;
  fasterThanAverage?: number;
  slowerThanAverage?: number;
  averageCohortAccuracy?: number;
  strongestSubjects?: string[];
  weakestSubjects?: string[];
}

export interface AttemptResultResponse {
  success?: boolean;
  attempt?: {
    attemptId: string;
    testId?: string;
    testTitle?: string;
    seriesSlug?: string;
    seriesName?: string | null;
    engine?: string;
    status?: string;
    startedAt?: string;
    submittedAt?: string | null;
    durationSeconds?: number;
    timeSpentSeconds?: number;
    language?: string;
  };
  attemptId?: string;
  totals: ResultTotals;
  sectionAnalysis?: GroupAnalysisItem[];
  subjectAnalysis?: GroupAnalysisItem[];
  topicAnalysis?: GroupAnalysisItem[];
  difficultyAnalysis?: GroupAnalysisItem[];
  tagAnalysis?: GroupAnalysisItem[];
  cohortComparison?: CohortComparison;
  behaviour?: AttemptBehaviour;
  graded?: boolean;
}

export interface SolutionQuestionItem {
  questionId: string;
  sectionId?: string;
  sectionTitle?: string;
  questionOrder?: number;
  qsNo?: number;
  questionType?: string;
  questionHtml?: string;
  comprehension?: string;
  options?: ExamOption[];
  markedOption?: string | null;
  correctOption?: string | null;
  multiCorrectOptions?: string[] | null;
  status: 'correct' | 'incorrect' | 'partial' | 'skipped' | 'unscored' | string;
  marksAwarded: number;
  posMarks?: number;
  negMarks?: number;
  timeSpent?: number;
  visitCount?: number;
  answerChanges?: number;
  isBookmarked?: boolean;
  languageUsed?: string;
  difficulty?: string | null;
  tags?: string[];
  subject?: string | null;
  chapter?: string | null;
  topic?: string | null;
  subtopic?: string | null;
  cohortAccuracy?: number;
  timeVsAverage?: number;
  solutionHtml?: string | null;
  videoSolution?: string | null;
  availableSolutionLangs?: string[];
}

export interface AttemptSolutionsResponse {
  success: boolean;
  attemptId: string;
  lang: string;
  testTitle: string;
  seriesSlug?: string;
  questions: SolutionQuestionItem[];
}

export interface HistoryAttemptItem {
  attemptId: string;
  testId: string;
  testTitle?: string;
  seriesSlug?: string;
  seriesName?: string | null;
  engine?: string;
  status: 'submitted' | 'in_progress' | string;
  startedAt: string;
  submittedAt?: string | null;
  score: number;
  totalMarks: number;
  percentage: number;
  accuracy: number;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  timeSpentSeconds: number;
  estimatedPercentile?: number;
}

export interface V1AttemptItem {
  id: string;
  user_id?: string | null;
  tg_user_id?: string | null;
  test_id: string;
  series_id?: string;
  score: number;
  total_marks: number;
  time_spent_seconds: number;
  user_responses?: Record<string, unknown>;
  status: string;
  created_at: string;
}

export interface StatsResponse {
  success: boolean;
  summary: {
    testsAttempted: number;
    testsSubmitted: number;
    totalScore: number;
    totalMarks: number;
    overallPercentage: number;
    averageAccuracy: number;
    totalQuestions: number;
    totalTimeSeconds: number;
  };
  scoreTrend: Array<{
    attemptId: string;
    testTitle: string;
    submittedAt: string;
    percentage: number;
    accuracy: number;
    estimatedPercentile?: number;
  }>;
  subjectStats: Array<{
    subject: string;
    questions: number;
    attempted: number;
    correct: number;
    accuracy: number;
    timeSpent: number;
  }>;
  strongestSubjects: Array<{ subject: string; accuracy: number }>;
  weakestSubjects: Array<{ subject: string; accuracy: number }>;
  difficultyStats: Array<{
    difficulty: string;
    questions: number;
    attempted: number;
    correct: number;
    accuracy: number;
  }>;
}
