import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import { Toaster } from './components/ui/sonner';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import PendingApprovalPage from './pages/auth/PendingApprovalPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
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
import MaterialViewPage from './pages/MaterialViewPage';
import RevieweeMaterialViewPage from './pages/RevieweeMaterialViewPage';
import AchievementsPage from './pages/AchievementsPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import VideoConferencePage from './pages/VideoConferencePage';
import DeckEditorPage from './pages/StudyMaterialEditorPage';
import LogsPage from './pages/LogsPage';
import CreateExamPage from './pages/CreateExamPage';
import ManageExamViewPage from './pages/ManageExamViewPage';
import RevieweeExamViewPage from './pages/RevieweeExamViewPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ZoomMeetingPage from './pages/ZoomMeetingPage';
import StudentManagementPage from './pages/StudentManagementPage';
import ProgramsPage from './pages/ProgramsPage';
import CampusesPage from './pages/CampusesPage';

import LandingPage from './pages/LandingPage';
import CalendarPage from './pages/CalendarPage';

function LegacyManageExamAnalyticsRedirect() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/manage-exams" replace />;
  return <Navigate to={`/manage-exams/${id}/view`} replace />;
}

function LegacyManageExamSubmissionsRedirect() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/manage-exams" replace />;
  return <Navigate to={`/manage-exams/${id}/view`} replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/pending" element={<PendingApprovalPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Reviewee Routes */}
                <Route element={<RoleRoute allowedRoles={['REVIEWEE']} />}>
                  <Route path="/study" element={<StudyHubPage />} />
                  <Route path="/study/:id/view" element={<RevieweeMaterialViewPage />} />
                  <Route path="/study/:id" element={<StudySessionPage />} />
                  <Route path="/exams" element={<ExamsPage />} />
                  <Route path="/exams/:id/view" element={<RevieweeExamViewPage />} />
                  <Route path="/exams/:id/take" element={<TakeExamPage />} />
                  <Route path="/exams/:id/result" element={<ExamResultPage />} />
                  <Route path="/exams/:id/review" element={<ExamReviewPage />} />
                  <Route path="/achievements" element={<AchievementsPage />} />
                </Route>

                {/* Reviewer/Admin Routes */}
                <Route element={<RoleRoute allowedRoles={['ADMIN', 'REVIEWER']} />}>
                  <Route path="/materials" element={<ManageMaterialsPage />} />
                  <Route path="/materials/create" element={<DeckEditorPage />} />
                  <Route path="/materials/:id/view" element={<MaterialViewPage />} />
                  <Route path="/materials/:id/edit" element={<DeckEditorPage />} />
                  <Route path="/manage-exams" element={<ManageExamsPage />} />
                  <Route path="/manage-exams/create" element={<CreateExamPage />} />
                  <Route path="/manage-exams/:id/view" element={<ManageExamViewPage />} />
                  <Route path="/manage-exams/:id/submissions" element={<LegacyManageExamSubmissionsRedirect />} />
                  <Route path="/manage-exams/:id/edit" element={<CreateExamPage />} />
                  <Route path="/manage-exams/:id/analytics" element={<LegacyManageExamAnalyticsRedirect />} />
                  <Route path="/students" element={<StudentManagementPage />} />
                  <Route path="/reviewer/students" element={<Navigate to="/students" replace />} />
                  <Route path="/admin/students" element={<Navigate to="/students" replace />} />
                </Route>

                {/* Admin Only Routes */}
                <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
                  <Route path="/admin/users" element={<UserManagementPage />} />
                  <Route path="/admin/programs" element={<ProgramsPage />} />
                  <Route path="/admin/campuses" element={<CampusesPage />} />
                  <Route path="/admin/logs" element={<LogsPage />} />
                </Route>

                {/* Shared Routes */}
                <Route path="/conferences" element={<VideoConferencePage />} />
                <Route path="/zoom-meeting" element={<ZoomMeetingPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Redirects */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
      <Toaster />
    </Router>
  );
}


export default App;
