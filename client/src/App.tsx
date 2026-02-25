import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import PendingApprovalPage from './pages/auth/PendingApprovalPage';
import DashboardPage from './pages/DashboardPage';
import ExamsPage from './pages/ExamsPage';
import TakeExamPage from './pages/TakeExamPage';
import ExamResultPage from './pages/ExamResultPage';
import ExamReviewPage from './pages/ExamReviewPage';
import ManageExamsPage from './pages/ManageExamsPage';
import StudyHubPage from './pages/StudyHubPage';
import StudySessionPage from './pages/StudySessionPage';
import UserManagementPage from './pages/UserManagementPage';
import ManageMaterialsPage from './pages/ManageMaterialsPage';
import AchievementsPage from './pages/AchievementsPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import VideoConferencePage from './pages/VideoConferencePage';
import CustomDeckPage from './pages/CustomDeckPage';
import ExamPerformancePage from './pages/ExamPerformancePage';
import LogsPage from './pages/LogsPage';
import CreateExamPage from './pages/CreateExamPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ZoomMeetingPage from './pages/ZoomMeetingPage';

import LandingPage from './pages/LandingPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/pending" element={<PendingApprovalPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Reviewee Routes */}
              <Route element={<RoleRoute allowedRoles={['REVIEWEE']} />}>
                <Route path="/study" element={<StudyHubPage />} />
                <Route path="/study/custom-deck" element={<CustomDeckPage />} />
                <Route path="/study/:id" element={<StudySessionPage />} />
                <Route path="/exams" element={<ExamsPage />} />
                <Route path="/exams/:id/take" element={<TakeExamPage />} />
                <Route path="/exams/:id/result" element={<ExamResultPage />} />
                <Route path="/exams/:id/review" element={<ExamReviewPage />} />
                <Route path="/achievements" element={<AchievementsPage />} />
              </Route>

              {/* Reviewer/Admin Routes */}
              <Route element={<RoleRoute allowedRoles={['ADMIN', 'REVIEWER']} />}>
                <Route path="/materials" element={<ManageMaterialsPage />} />
                <Route path="/materials/create" element={<CustomDeckPage />} />
                <Route path="/materials/:id/edit" element={<CustomDeckPage />} />
                <Route path="/manage-exams" element={<ManageExamsPage />} />
                <Route path="/manage-exams/create" element={<CreateExamPage />} />
                <Route path="/manage-exams/:id/edit" element={<CreateExamPage />} />
                <Route path="/reports/exam-performance/:id" element={<ExamPerformancePage />} />
              </Route>

              {/* Admin Only Routes */}
              <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin/users" element={<UserManagementPage />} />
                <Route path="/admin/logs" element={<LogsPage />} />
              </Route>

              {/* Shared Routes */}
              <Route path="/conferences" element={<VideoConferencePage />} />
              <Route path="/zoom-meeting" element={<ZoomMeetingPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Redirects */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}


export default App;
