import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { CvBuilderPage } from "./pages/CvBuilderPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { JobMatchPage } from "./pages/JobMatchPage";
import { JobSearchPage } from "./pages/JobSearchPage";
import { SkillGapPage } from "./pages/SkillGapPage";
import { InterviewCoachPage } from "./pages/InterviewCoachPage";
import { LinkedInOptimizerPage } from "./pages/LinkedInOptimizerPage";
import { SalaryInsightsPage } from "./pages/SalaryInsightsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ExportPrintPage } from "./pages/ExportPrintPage";
import { useSettingsStore } from "./state/useSettingsStore";

function App() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="export-print" element={<ExportPrintPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<CvBuilderPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="job-match" element={<JobMatchPage />} />
          <Route path="job-search" element={<JobSearchPage />} />
          <Route path="skill-gap" element={<SkillGapPage />} />
          <Route path="interview" element={<InterviewCoachPage />} />
          <Route path="linkedin" element={<LinkedInOptimizerPage />} />
          <Route path="salary" element={<SalaryInsightsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
