import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import NewMeetingPage from "./pages/NewMeetingPage";
import RepositoriesPage from "./pages/RepositoriesPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import MeetingLivePage from "./pages/MeetingLivePage";
import MeetingReportPage from "./pages/MeetingReportPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/meeting/new" element={<NewMeetingPage />} />
          <Route path="/meeting/:id" element={<MeetingLivePage />} />
          <Route path="/meeting/:id/report" element={<MeetingReportPage />} />
          <Route path="/repos" element={<RepositoriesPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
