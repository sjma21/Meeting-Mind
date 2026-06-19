import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "./hooks/useAuth";
import AuthPage from "./pages/AuthPage";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import NewMeetingPage from "./pages/NewMeetingPage";
import RepositoriesPage from "./pages/RepositoriesPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import MeetingLivePage from "./pages/MeetingLivePage";
import MeetingReportPage from "./pages/MeetingReportPage";

function RootRedirect() {
  const { session, loading } = useSession();
  if (loading) return null;
  return <Navigate to={session ? "/dashboard" : "/auth"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
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
