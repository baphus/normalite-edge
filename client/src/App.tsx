import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { MotionProvider } from './providers/MotionProvider';
import InstallBanner from './components/InstallBanner';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import { Toaster } from './components/ui/sonner';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AuthCallbackPage from './pages/auth/AuthCallbackPage';
import CompleteProfilePage from './pages/auth/CompleteProfilePage';
import SetPasswordPage from './pages/auth/SetPasswordPage';

import DashboardPage from './pages/DashboardPage';
import ExamsPage from './pages/ExamsPage';
import TakeExamPage from './pages/TakeExamPage';
import ExamResultPage from './pages/ExamResultPage';
import ExamReviewPage from './pages/ExamReviewPage';
import ManageExamsPage from './pages/ManageExamsPage';
import StudyHubPage from './pages/StudyHubPage';
import StudySessionPage from './pages/StudySessionPage';
import { ErrorBoundary } from './pages/StudySessionPageError';
import UserManagementPage from './pages/UserManagementPage';
import ManageMaterialsPage from './pages/ManageMaterialsPage';
import MaterialViewPage from './pages/MaterialViewPage';
import RevieweeMaterialViewPage from './pages/RevieweeMaterialViewPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import StudentProfileViewPage from './pages/StudentProfileViewPage';
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
import ManageCategoriesPage from './pages/ManageCategoriesPage';
import OnboardingPage from './pages/OnboardingPage';

import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import FaqPage from './pages/FaqPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
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
          <MotionProvider>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Supabase auth landings. These sit outside ProtectedRoute: the
                user is mid-authentication and has no profile yet, so the guard
                would bounce them straight back out. */}
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/complete-profile" element={<CompleteProfilePage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<RoleRoute allowedRoles={['REVIEWEE']} />}>
                <Route path="/onboarding" element={<OnboardingPage />} />
              </Route>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Reviewee Routes */}
                <Route element={<RoleRoute allowedRoles={['REVIEWEE']} />}>
                  <Route path="/study" element={<StudyHubPage />} />
                  <Route path="/study/:id/view" element={<RevieweeMaterialViewPage />} />
                  <Route path="/study/:id" element={<ErrorBoundary><StudySessionPage /></ErrorBoundary>} />
                  <Route path="/exams" element={<ExamsPage />} />
                  <Route path="/exams/:id/view" element={<RevieweeExamViewPage />} />
                  <Route path="/exams/:id/take" element={<TakeExamPage />} />
                  <Route path="/exams/:id/result" element={<ExamResultPage />} />
                  <Route path="/exams/:id/review" element={<ExamReviewPage />} />
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
                  <Route path="/student/:id/profile" element={<StudentProfileViewPage />} />
                  <Route path="/reviewer/students" element={<Navigate to="/students" replace />} />
                  <Route path="/admin/students" element={<Navigate to="/students" replace />} />
                </Route>

                {/* Admin Only Routes */}
                <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
                  <Route path="/admin/users" element={<UserManagementPage />} />
                  <Route path="/admin/programs" element={<ProgramsPage />} />
                  <Route path="/admin/campuses" element={<CampusesPage />} />
                  <Route path="/admin/categories" element={<ManageCategoriesPage />} />
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
          </MotionProvider>
          <InstallBanner />
        </NotificationProvider>
      </AuthProvider>
      <Toaster />
    </Router>
  );
}


export default App;
