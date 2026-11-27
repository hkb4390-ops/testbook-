import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { Layout } from './components/Layout';
import { SecurityGuard } from './components/SecurityGuard';
import { WatermarkOverlay } from './components/WatermarkOverlay';
import { TelegramWelcomeModal } from './components/TelegramWelcomeModal';
import { HomePage } from './pages/HomePage';
import { SeriesListPage } from './pages/SeriesListPage';
import { SeriesDetailPage } from './pages/SeriesDetailPage';
import { TestsPage } from './pages/TestsPage';
import { TrendingPage } from './pages/TrendingPage';
import { SearchPage } from './pages/SearchPage';
import { InstructionsPage } from './pages/InstructionsPage';
import { ExamEnginePage } from './pages/ExamEnginePage';
import { ResultPage } from './pages/ResultPage';
import { SolutionsPage } from './pages/SolutionsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  return (
    <ThemeProvider>
      <PreferencesProvider>
        <BrowserRouter>
          <SecurityGuard />
          <WatermarkOverlay />
          <TelegramWelcomeModal />
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/series" element={<SeriesListPage />} />
              <Route path="/series/:slug" element={<SeriesDetailPage />} />
              <Route path="/tests" element={<TestsPage />} />
              <Route path="/trending" element={<TrendingPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/exam/:testId/instructions" element={<InstructionsPage />} />
              <Route path="/exam/:testId/play" element={<ExamEnginePage />} />
              <Route path="/results/:attemptId" element={<ResultPage />} />
              <Route path="/solutions/:attemptId" element={<SolutionsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </PreferencesProvider>
    </ThemeProvider>
  );
}
